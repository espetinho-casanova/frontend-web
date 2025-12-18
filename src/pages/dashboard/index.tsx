import { useState, useEffect } from "react";
import { canSSRAuth } from "../../utils/canSSRAuth";
import Head from "next/head";
import styles from "./styles.module.scss";

import { Header } from "../../components/Header";
import { FiPlus, FiEdit2, FiTrash2, FiMinus, FiCheckCircle, FiX, FiUsers, FiRotateCw } from "react-icons/fi";
import { ModalProductDetail } from "../../components/ModalProductDetail";
import { Product, Category } from "../../types/order";

import { setupApiClient } from "../../services/api";
import { toast } from "react-toastify";
import { parseCookies } from "nookies";
import { env } from "../../config/env";

import { ModalOrder } from "../../components/ModalOrder";
import { OrderStatus, POLLING_INTERVAL_MS } from "../../utils/constants";

import Link from "next/link";

import Modal from "react-modal";
import { CartItem } from "../../types/order";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type OrderItem = {
  id: string;
  table: string | number;
  status: string;
  draft: boolean;
  name: string | null;
  userId?: string;
  userName?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  details: OrderDetailProps;
};

export interface OrdersProps {
  readonly orders: OrderItem[];
}

export interface OrderDetailProps {
  orderItems: ItemProps[];
}

export type ItemProps = {
  id: string;
  amount: number;
  orderId: string;
  productId: number;
  removals?: string[]; // Ingredientes removidos
  notes?: string; // Observações
  meatPoint?: string; // Ponto da carne
  takenToTable?: boolean; // Se o item já foi levado para a mesa
  product: {
    id: number;
    name: string;
    price: string | number;
    description: string;
    banner: string;
    available: boolean;
    categoryId: number;
  };
  meatChoice?: {
    id: number;
    name: string;
    price: string | number;
    banner: string;
  } | null; // Espetinho escolhido para Ká/Xis
  additions?: Array<{
    id: string;
    addon: {
      id: number;
      name: string;
      price: string | number;
      image?: string | null;
    };
  }>; // Adicionais escolhidos
};

export type OrderItemProps = {
  order: {
    id: string;
    table: string | number;
    status: string;
    draft: boolean;
    name: string | null;
    userId?: string;
    userName?: string | null;
  };
  orderItems: ItemProps[];
};

export default function Dashboard({ orders }: OrdersProps) {
  const [orderList, setOrderList] = useState(orders || []);
  const [orderItemDetails, setOrderItemDetails] = useState<OrderItemProps>();
  const [modalVisible, setModalVisible] = useState(false);

  // Estado para modal de edição do carrinho
  const [editCartModalOpen, setEditCartModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingCart, setEditingCart] = useState<CartItem[]>([]);
  const [editingTableName, setEditingTableName] = useState("");
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [isPolling, setIsPolling] = useState(true);
  const [finishedOrdersModalOpen, setFinishedOrdersModalOpen] = useState(false);
  const [finishedOrders, setFinishedOrders] = useState<OrderItem[]>([]);

  // Estados para fila de espera
  const [waitingQueueModalOpen, setWaitingQueueModalOpen] = useState(false);
  const [waitingQueue, setWaitingQueue] = useState<Array<{ id: string; name: string; createdAt: string }>>([]);
  const [newPersonName, setNewPersonName] = useState("");

  // Estados para adicionar novos itens
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Separar pedidos por status
  const ordersInPreparation = orderList.filter((order) => Number(order.status) === OrderStatus.IN_PREPARATION);
  const ordersReady = orderList.filter((order) => Number(order.status) === OrderStatus.READY);

  function handleCloseModal() {
    setModalVisible(false);
  }

  async function handleOpenModalView(id: string) {
    // Tentar usar dados já carregados primeiro
    const existingOrder = orderList.find((order) => order.id === id);

    if (existingOrder && existingOrder.details) {
      // Usar dados já carregados (evita requisição desnecessária)
      setOrderItemDetails({
        order: {
          id: existingOrder.id,
          table: existingOrder.table,
          status: existingOrder.status,
          draft: existingOrder.draft,
          name: existingOrder.name,
          userId: existingOrder.userId,
          userName: existingOrder.userName || null,
        },
        orderItems: existingOrder.details.orderItems,
      });
      setModalVisible(true);
    } else {
      // Se não estiver carregado, buscar do servidor
      const response = await fetchOrderDetails(id);
      setOrderItemDetails(response);
      setModalVisible(true);
    }
  }

  async function fetchOrders() {
    const apiClient = setupApiClient();
    const response = await apiClient.get("/orders");
    const orders = response.data;
    return orders;
  }

  async function fetchFinishedOrders() {
    const apiClient = setupApiClient();
    const response = await apiClient.get("/orders/finished");
    const orders = response.data;
    return orders;
  }

  async function handleOpenFinishedOrdersModal() {
    const finished = await fetchFinishedOrders();
    setFinishedOrders(finished);
    setFinishedOrdersModalOpen(true);
  }

  async function handleReturnToReady(orderId: string) {
    try {
      const apiClient = setupApiClient();

      // Fazer a chamada à API - o SSE irá atualizar automaticamente
      await apiClient.put("/order/return-to-ready", {
        orderId,
      });

      toast.success("Pedido retornado para 'Prontos'!");
      // O SSE irá atualizar a lista automaticamente quando o backend notificar
    } catch (error: any) {
      console.error("Erro ao retornar pedido:", error);
      toast.error(error.response?.data?.error || "Erro ao retornar pedido");

      // Em caso de erro, recarregar para garantir sincronização
      const updatedOrders = await fetchOrders();
      setOrderList(updatedOrders);
    }
  }

  async function fetchWaitingQueue() {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/waiting-queue");
      setWaitingQueue(response.data);
    } catch (error) {
      console.error("Erro ao buscar fila de espera:", error);
      toast.error("Erro ao carregar fila de espera");
    }
  }

  async function handleAddToWaitingQueue() {
    if (!newPersonName.trim()) {
      toast.warn("Digite o nome da pessoa");
      return;
    }

    try {
      const apiClient = setupApiClient();
      await apiClient.post("/waiting-queue", {
        name: newPersonName.trim(),
      });

      toast.success("Pessoa adicionada à fila");
      setNewPersonName("");
      await fetchWaitingQueue();
    } catch (error: any) {
      console.error("Erro ao adicionar à fila:", error);
      toast.error(error.response?.data?.error || "Erro ao adicionar à fila");
    }
  }

  async function handleRemoveFromWaitingQueue(id: string) {
    try {
      const apiClient = setupApiClient();
      await apiClient.delete(`/waiting-queue/${id}`);

      toast.success("Pessoa removida da fila");
      await fetchWaitingQueue();
    } catch (error: any) {
      console.error("Erro ao remover da fila:", error);
      toast.error(error.response?.data?.error || "Erro ao remover da fila");
    }
  }

  function handleOpenWaitingQueueModal() {
    setWaitingQueueModalOpen(true);
    fetchWaitingQueue();
  }

  async function handleToggleItemTakenToTable(itemId: string, currentStatus: boolean) {
    try {
      const apiClient = setupApiClient();
      await apiClient.put("/order/item/toggle-taken", {
        itemId,
        takenToTable: !currentStatus,
      });

      // Atualizar o estado local imediatamente para feedback visual
      const updatedOrderList = orderList.map((order) => {
        if (order.details?.orderItems) {
          const updatedItems = order.details.orderItems.map((item) => {
            if (item.id === itemId) {
              return { ...item, takenToTable: !currentStatus };
            }
            return item;
          });
          return {
            ...order,
            details: {
              ...order.details,
              orderItems: updatedItems,
            },
          };
        }
        return order;
      });

      setOrderList(updatedOrderList);

      // Recarregar pedidos para garantir sincronização
      setTimeout(() => {
        fetchOrders();
      }, 200);
    } catch (error: any) {
      console.error("Erro ao atualizar status do item:", error);
      toast.error(error.response?.data?.error || "Erro ao atualizar item");
    }
  }

  async function fetchOrderDetails(id: string) {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get(`/order/detail`, {
        params: {
          orderId: id,
        },
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async function handleMarkAsReady(id: string) {
    const apiClient = setupApiClient();
    await apiClient.put("/order/ready", {
      orderId: id,
    });

    // Buscar novamente os pedidos atualizados e seus detalhes
    const updatedOrders = await fetchOrders();

    // Atualizar o estado orderList com os pedidos atualizados
    setOrderList(updatedOrders);

    toast.success("Pedido marcado como pronto!");
  }

  async function handleMarkAsInPreparation(id: string) {
    const apiClient = setupApiClient();
    await apiClient.put("/order/in-preparation", {
      orderId: id,
    });

    // Buscar novamente os pedidos atualizados e seus detalhes
    const updatedOrders = await fetchOrders();

    // Atualizar o estado orderList com os pedidos atualizados
    setOrderList(updatedOrders);

    toast.success("Pedido movido para preparação!");
  }

  async function handleFinishItem(id: string) {
    const apiClient = setupApiClient();
    await apiClient.put("/order/finish", {
      orderId: id,
    });

    // Buscar novamente os pedidos atualizados e seus detalhes
    const updatedOrders = await fetchOrders();

    // Atualizar o estado orderList com os pedidos atualizados
    setOrderList(updatedOrders);

    setModalVisible(false);
    toast.success("Pedido entregue!");
  }

  Modal.setAppElement("#__next");

  // Função para atualizar a lista de pedidos
  async function handleRefreshOrder() {
    // Buscar os pedidos atualizados e seus detalhes
    const updatedOrders = await fetchOrders();

    // Atualizar o estado orderList com os pedidos atualizados
    setOrderList(updatedOrders);
  }

  // Conexão SSE para atualizações em tempo real
  useEffect(() => {
    if (!isPolling) return;

    let abortController: AbortController | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    async function connectSSE() {
      if (!isMounted) return;

      try {
        const cookies = parseCookies();
        const token = cookies[env.NEXT_PUBLIC_COOKIE_NAME];

        if (!token) {
          console.error("Token não encontrado para SSE");
          return;
        }

        abortController = new AbortController();
        const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/orders/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          console.error("Erro ao conectar SSE:", response.statusText);
          if (isMounted) {
            reconnectTimeout = setTimeout(() => {
              if (isMounted && isPolling) {
                connectSSE();
              }
            }, 3000);
          }
          return;
        }

        reader = response.body?.getReader();
        if (!reader) {
          console.error("Erro ao obter reader do SSE");
          if (isMounted) {
            reconnectTimeout = setTimeout(() => {
              if (isMounted && isPolling) {
                connectSSE();
              }
            }, 3000);
          }
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (isMounted) {
          try {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!isMounted) break;

              if (line.startsWith("event: orders-update")) {
                continue;
              }
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.orders && isMounted) {
                    // Buscar detalhes completos de cada pedido
                    const ordersWithDetails = await Promise.all(
                      data.orders.map(async (order: OrderItem) => {
                        try {
                          const apiClient = setupApiClient();
                          const detailResponse = await apiClient.get(`/order/detail`, {
                            params: { orderId: order.id },
                          });
                          return {
                            ...order,
                            details: detailResponse.data,
                          };
                        } catch (error) {
                          console.error(`Erro ao buscar detalhes do pedido ${order.id}:`, error);
                          return order;
                        }
                      })
                    );
                    if (isMounted) {
                      setOrderList(ordersWithDetails);
                    }
                  }
                } catch (error) {
                  console.error("Erro ao processar dados SSE:", error);
                }
              }
            }
          } catch (readError: any) {
            if (readError.name === "AbortError" || !isMounted) {
              break;
            }
            throw readError;
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError" || !isMounted) {
          return;
        }
        console.error("Erro na conexão SSE:", error);
        // Tentar reconectar após 3 segundos
        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            if (isMounted && isPolling) {
              connectSSE();
            }
          }, 3000);
        }
      } finally {
        // Limpar reader de forma segura
        if (reader) {
          try {
            reader.cancel().catch(() => {
              // Ignorar erros ao cancelar
            });
          } catch (error) {
            // Ignorar erros
          }
          reader = null;
        }
      }
    }

    connectSSE();

    return () => {
      isMounted = false;

      // Limpar timeout de reconexão
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // Abortar requisição
      if (abortController) {
        try {
          abortController.abort();
        } catch (error) {
          // Ignorar erros
        }
        abortController = null;
      }

      // Cancelar reader de forma assíncrona segura
      if (reader) {
        reader.cancel().catch(() => {
          // Ignorar erros ao cancelar
        });
        reader = null;
      }
    };
  }, [isPolling]);

  // Pausar polling quando modal estiver aberto para evitar conflitos
  useEffect(() => {
    if (modalVisible || editCartModalOpen) {
      setIsPolling(false);
    } else {
      setIsPolling(true);
    }
  }, [modalVisible, editCartModalOpen]);

  async function handleEditOrder(order: OrderItem) {
    // Tentar usar dados já carregados primeiro
    let orderDetails = order.details;

    // Se não tiver detalhes carregados, buscar do servidor
    if (!orderDetails) {
      orderDetails = await fetchOrderDetails(order.id);
    }

    if (!orderDetails) {
      toast.error("Erro ao carregar pedido para edição");
      return;
    }

    // Converter itens do pedido para o formato do carrinho
    const cartItems: CartItem[] = orderDetails.orderItems.map((item) => {
      // Calcular preço total do item
      const basePrice = Number.parseFloat(String(item.product.price)) || 0;

      // Agrupar adicionais por ID para contar quantidades
      const additionsMap = new Map<string, { id: string; name: string; price: number; quantity: number }>();

      (item.additions || []).forEach((add: any) => {
        const addonId = String(add.addon?.id || add.id);
        const addonName = add.addon?.name || add.name;
        const addonPrice = Number.parseFloat(String(add.addon?.price || add.price || 0));

        if (additionsMap.has(addonId)) {
          additionsMap.get(addonId)!.quantity += 1;
        } else {
          additionsMap.set(addonId, {
            id: addonId,
            name: addonName,
            price: addonPrice,
            quantity: 1,
          });
        }
      });

      const additionsArray = Array.from(additionsMap.values());
      const additionsTotal = additionsArray.reduce((sum, add) => sum + add.price * add.quantity, 0);
      const itemTotal = (basePrice + additionsTotal) * item.amount;

      return {
        product: {
          ...item.product,
          ingredients: (item.product as any).ingredients || [],
          addons: (item.product as any).allowedAddons || [],
        },
        amount: item.amount,
        total: itemTotal,
        meatChoice: item.meatChoice
          ? {
              ...item.meatChoice,
              description: "",
              categoryId: item.product.categoryId,
              ingredients: [],
              addons: [],
              available: true,
            }
          : undefined,
        removals: item.removals || [],
        additions: additionsArray.map((add) => ({
          id: add.id,
          name: add.name,
          price: String(add.price),
          quantity: add.quantity,
        })),
        notes: item.notes || "",
        meatPoint: item.meatPoint || undefined,
      };
    });

    // Preencher estados para edição
    setEditingOrderId(order.id);
    setEditingCart(cartItems);
    setEditingTableName(String(order.table || ""));
    setEditCartModalOpen(true);

    // Carregar categorias e produtos quando abrir o modal de edição
    await loadCategoriesAndProducts();
  }

  async function loadCategoriesAndProducts() {
    try {
      const apiClient = setupApiClient();

      // Buscar categorias
      const categoriesResponse = await apiClient.get("/categories");
      const categoriesData = categoriesResponse.data;
      setCategories(categoriesData);

      // Selecionar primeira categoria e carregar produtos
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0]);
        await fetchProductsByCategory(categoriesData[0].id);
      }
    } catch (error) {
      toast.error("Erro ao carregar categorias");
    }
  }

  async function fetchProductsByCategory(categoryId: string | number) {
    try {
      const apiClient = setupApiClient();
      const response = await apiClient.get("/category/product", {
        params: { categoryId },
      });
      setProducts(response.data);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    }
  }

  function handleProductClick(product: Product) {
    if (!product.available) {
      toast.warning("Este produto está temporariamente indisponível!");
      return;
    }
    setSelectedProduct(product);
    setProductModalOpen(true);
  }

  function isComplexProduct(product: Product): boolean {
    const productName = product.name.toLowerCase();
    const isXis = productName.includes("xis");
    const isKa = productName.includes("ká") || productName.includes("ka");
    return isXis || isKa;
  }

  function handleAddToCart(item: CartItem) {
    // Verificar se já existe um item idêntico no carrinho
    const existingItemIndex = editingCart.findIndex((cartItem) => {
      const sameProduct = cartItem.product.id === item.product.id;
      const sameMeat = cartItem.meatChoice?.id === item.meatChoice?.id;
      const sameRemovals = JSON.stringify(cartItem.removals.sort()) === JSON.stringify(item.removals.sort());
      const sameAdditions =
        JSON.stringify(cartItem.additions.map((a) => ({ id: a.id, qty: a.quantity })).sort((a, b) => a.id.localeCompare(b.id))) ===
        JSON.stringify(item.additions.map((a) => ({ id: a.id, qty: a.quantity })).sort((a, b) => a.id.localeCompare(b.id)));
      const sameNotes = cartItem.notes.trim() === item.notes.trim();
      const sameMeatPoint = cartItem.meatPoint === item.meatPoint;

      return sameProduct && sameMeat && sameRemovals && sameAdditions && sameNotes && sameMeatPoint;
    });

    if (existingItemIndex !== -1) {
      // Item idêntico encontrado - incrementar quantidade
      const updatedCart = [...editingCart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        amount: updatedCart[existingItemIndex].amount + item.amount,
        total: updatedCart[existingItemIndex].total + item.total,
      };
      setEditingCart(updatedCart);
      toast.success("Quantidade atualizada no carrinho!");
    } else {
      // Item diferente - adicionar nova linha
      setEditingCart([...editingCart, item]);
      toast.success("Item adicionado ao carrinho!");
    }
    setProductModalOpen(false);
  }

  function handleRemoveFromCart(index: number) {
    const updatedCart = [...editingCart];
    updatedCart.splice(index, 1);
    setEditingCart(updatedCart);
  }

  function handleUpdateCartItemQuantity(index: number, newAmount: number) {
    if (newAmount < 1) {
      if (confirm("Remover este item do carrinho?")) {
        handleRemoveFromCart(index);
      }
      return;
    }

    const updatedCart = [...editingCart];
    const item = updatedCart[index];
    const unitPrice = item.total / item.amount;
    updatedCart[index] = {
      ...item,
      amount: newAmount,
      total: unitPrice * newAmount,
    };
    setEditingCart(updatedCart);
  }

  function handleUpdateCartItemNote(index: number, newNote: string) {
    const updatedCart = [...editingCart];
    updatedCart[index] = {
      ...updatedCart[index],
      notes: newNote,
    };
    setEditingCart(updatedCart);
    setEditingNoteIndex(null);
    setEditingNoteValue("");
  }

  function startEditingNote(index: number, currentNote: string) {
    setEditingNoteIndex(index);
    setEditingNoteValue(currentNote);
  }

  function calculateCartTotal(): number {
    return editingCart.reduce((sum, item) => sum + item.total, 0);
  }

  async function handleFinishEditOrder() {
    if (editingCart.length === 0) {
      toast.warn("Adicione itens ao carrinho!");
      return;
    }

    if (!editingTableName.trim()) {
      toast.warn("Informe o número da mesa ou nome!");
      return;
    }

    if (!editingOrderId) {
      toast.error("Erro: ID do pedido não encontrado");
      return;
    }

    try {
      const apiClient = setupApiClient();

      // Atualizar mesa/nome
      const tableValue = editingTableName.trim();

      if (tableValue) {
        await apiClient.put("/order/update", {
          orderId: editingOrderId,
          table: tableValue,
        });
      }

      // Preparar itens para atualização
      const itemsToUpdate = editingCart.map((cartItem) => ({
        productId: Number(cartItem.product.id),
        amount: cartItem.amount,
        meatChoiceId: cartItem.meatChoice?.id ? Number(cartItem.meatChoice.id) : undefined,
        meatPoint: cartItem.meatPoint,
        removals: cartItem.removals,
        additions: cartItem.additions.flatMap((add) => new Array(add.quantity).fill(Number(add.id))),
        notes: cartItem.notes,
      }));

      await apiClient.put("/order/update-items", {
        orderId: editingOrderId,
        items: itemsToUpdate,
      });

      toast.success("Pedido atualizado com sucesso!");

      // Limpar estados
      setEditingCart([]);
      setEditingTableName("");
      setEditingOrderId(null);
      setEditCartModalOpen(false);

      // Atualizar lista de pedidos
      const updatedOrders = await fetchOrders();
      setOrderList(updatedOrders);
    } catch (error) {
      toast.error("Erro ao atualizar pedido!");
    }
  }

  Modal.setAppElement("#__next");

  // Configuração dos sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Estado para o item sendo arrastado
  const [activeId, setActiveId] = useState<string | null>(null);

  // Collision detection customizada que prioriza pedidos para reordenação fluida
  // e usa rectIntersection para detectar toda a área das colunas
  const customCollisionDetection: CollisionDetection = (args) => {
    // Primeiro, verificar se o ponteiro está diretamente sobre um pedido usando pointerWithin
    // Isso garante reordenação fluida quando arrastando sobre outros pedidos
    const pointerCollisions = pointerWithin(args);
    const orderPointerCollision = pointerCollisions.find((collision) => {
      const isOrderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(collision.id));
      return isOrderId && orderList.some((order) => order.id === String(collision.id));
    });

    // Se o ponteiro está sobre um pedido, verificar se também está sobre uma coluna
    // Se sim, retornar ambos para mostrar feedback visual da coluna
    if (orderPointerCollision) {
      const columnPointerCollision = pointerCollisions.find(
        (collision) => collision.id === "preparation-column" || collision.id === "ready-column"
      );

      // Se também está sobre a coluna, verificar se o pedido está na mesma coluna
      // Se estiver na mesma coluna, priorizar o pedido para reordenação
      // Se estiver em coluna diferente, priorizar a coluna para feedback visual
      if (columnPointerCollision) {
        const orderId = String(orderPointerCollision.id);
        const order = orderList.find((o) => o.id === orderId);
        const activeOrder = orderList.find((o) => o.id === String(args.active.id));

        if (order && activeOrder) {
          const orderStatus = Number(order.status);
          const activeStatus = Number(activeOrder.status);
          const columnId = String(columnPointerCollision.id);
          const isSameColumn =
            (orderStatus === 1 && columnId === "preparation-column") || (orderStatus === 2 && columnId === "ready-column");

          // Se está na mesma coluna, priorizar pedido para reordenação
          if (isSameColumn && orderStatus === activeStatus) {
            return [orderPointerCollision, columnPointerCollision];
          }
        }

        // Se está em coluna diferente, priorizar coluna para feedback visual
        return [columnPointerCollision, orderPointerCollision];
      }

      // Se só está sobre o pedido, retornar apenas o pedido
      return [orderPointerCollision];
    }

    // Verificar se o ponteiro está sobre o header "Entregues"
    const finishButtonPointerCollision = pointerCollisions.find((collision) => collision.id === "finish-button");
    if (finishButtonPointerCollision) {
      return [finishButtonPointerCollision];
    }

    // Verificar se o ponteiro está diretamente sobre uma coluna usando pointerWithin
    // Isso permite detectar quando está sobre área vazia da coluna
    const columnPointerCollision = pointerCollisions.find(
      (collision) => collision.id === "preparation-column" || collision.id === "ready-column"
    );

    // Se o ponteiro está sobre uma coluna, priorizar ela (mesmo que haja pedidos na coluna)
    if (columnPointerCollision) {
      return [columnPointerCollision];
    }

    // Usar rectIntersection para detectar colisões por área (detecta toda a área da coluna, não apenas o header)
    const rectCollisions = rectIntersection(args);

    // Verificar primeiro se há colisão com uma coluna (qualquer parte da área)
    // Isso permite mover pedidos para colunas mesmo quando há outros pedidos na coluna
    const columnRectCollision = rectCollisions.find(
      (collision) => collision.id === "preparation-column" || collision.id === "ready-column"
    );

    // Verificar se também há colisão com pedido
    const orderRectCollision = rectCollisions.find((collision) => {
      const isOrderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(collision.id));
      return isOrderId && orderList.some((order) => order.id === String(collision.id));
    });

    // Se há colisão com coluna E pedido, retornar ambos para que o isOver funcione
    // Retornar a coluna primeiro para garantir que o feedback visual apareça
    // O handleDragEnd vai verificar se overId é um pedido ou coluna e tratar adequadamente
    if (columnRectCollision && orderRectCollision) {
      return [columnRectCollision, orderRectCollision];
    }

    // Se só há colisão com coluna, retornar a coluna
    if (columnRectCollision) {
      return [columnRectCollision];
    }

    // Se só há colisão com pedido, retornar o pedido
    if (orderRectCollision) {
      return [orderRectCollision];
    }

    // Por último, verificar se há colisão com o header/botão "Entregues"
    const finishButtonRectCollision = rectCollisions.find((collision) => collision.id === "finish-button");
    if (finishButtonRectCollision) {
      return [finishButtonRectCollision];
    }

    // Por último, retornar todas as colisões
    return rectCollisions;
  };

  // Função para lidar com o fim do arraste
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Se arrastou para o mesmo lugar, não fazer nada
    if (activeId === overId) {
      return;
    }

    // Encontrar o pedido sendo arrastado
    const draggedOrder = orderList.find((order) => order.id === activeId);
    if (!draggedOrder) return;

    const currentStatus = Number(draggedOrder.status);

    // Se arrastou para o botão "Entregues", entregar o pedido (qualquer status pode ser entregue)
    if (overId === "finish-button") {
      await handleFinishItem(activeId);
      return;
    }

    // Se arrastou para "preparation-column" (status 1)
    if (overId === "preparation-column") {
      // Se já está em preparação, não fazer nada (apenas reordenar se necessário)
      if (currentStatus === 1) {
        return;
      }
      // Se está pronto, voltar para preparação
      if (currentStatus === 2) {
        await handleMarkAsInPreparation(activeId);
        return;
      }
    }

    // Se arrastou para "ready-column" (status 2)
    if (overId === "ready-column") {
      // Se já está pronto, não fazer nada (apenas reordenar se necessário)
      if (currentStatus === 2) {
        return;
      }
      // Se está em preparação, marcar como pronto
      if (currentStatus === 1) {
        await handleMarkAsReady(activeId);
        return;
      }
    }

    // Se arrastou para outro pedido, verificar a coluna de destino
    const targetOrder = orderList.find((order) => order.id === overId);
    if (targetOrder) {
      const targetStatus = Number(targetOrder.status);

      // Se arrastou para um pedido em preparação e o atual está pronto
      if (targetStatus === 1 && currentStatus === 2) {
        await handleMarkAsInPreparation(activeId);
        return;
      }

      // Se arrastou para um pedido pronto e o atual está em preparação
      if (targetStatus === 2 && currentStatus === 1) {
        await handleMarkAsReady(activeId);
        return;
      }

      // Se arrastou para outro pedido na mesma coluna (mesmo status), reordenar
      if (targetStatus === currentStatus) {
        await handleReorderOrders(activeId, overId, currentStatus);
        return;
      }
    }
  }

  // Função para reordenar pedidos na mesma coluna
  async function handleReorderOrders(draggedId: string, targetId: string, status: number) {
    try {
      const apiClient = setupApiClient();

      // Buscar a lista atual de pedidos com o mesmo status
      const sameStatusOrders = orderList.filter((order) => Number(order.status) === status);

      // Encontrar índices
      const draggedIndex = sameStatusOrders.findIndex((order) => order.id === draggedId);
      const targetIndex = sameStatusOrders.findIndex((order) => order.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Criar nova ordem
      const newOrder = [...sameStatusOrders];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, removed);

      // Extrair IDs na nova ordem
      const orderIds = newOrder.map((order) => order.id);

      // Enviar nova ordem para o backend
      await apiClient.put("/order/reorder", {
        orderIds,
      });

      // Atualizar estado local imediatamente para feedback visual
      const updatedOrderList = [...orderList];
      const draggedOrderIndex = updatedOrderList.findIndex((order) => order.id === draggedId);
      const targetOrderIndex = updatedOrderList.findIndex((order) => order.id === targetId);

      if (draggedOrderIndex !== -1 && targetOrderIndex !== -1 && Number(updatedOrderList[draggedOrderIndex].status) === status) {
        const [draggedOrder] = updatedOrderList.splice(draggedOrderIndex, 1);
        updatedOrderList.splice(targetOrderIndex, 0, draggedOrder);
        setOrderList(updatedOrderList);
      }

      // Recarregar pedidos para garantir sincronização
      setTimeout(() => {
        fetchOrders();
      }, 200);
    } catch (error) {
      console.error("Erro ao reordenar pedidos:", error);
      toast.error("Erro ao reordenar pedidos");
    }
  }

  // Função para lidar com o início do arraste
  function handleDragStart(event: any) {
    setActiveId(String(event.active.id));
  }

  function DroppableColumn({ id, children }: { readonly id: string; readonly children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
      id,
    });

    return (
      <div
        ref={setNodeRef}
        className={id === "preparation-column" ? styles.preparationColumn : styles.readyColumn}
        style={{
          backgroundColor: isOver ? "rgba(63, 255, 163, 0.1)" : "transparent",
          border: isOver ? "2px dashed var(--green-900)" : "none",
          borderRadius: isOver ? "8px" : "0",
          // Garantir que toda a área seja droppable, incluindo o header
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    );
  }

  function FinishButtonDropZone({ onOpenModal, isOver }: { readonly onOpenModal: () => void; readonly isOver: boolean }) {
    return (
      <button
        className={styles.refreshButton}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenModal();
        }}
        title="Ver pedidos entregues (ou arraste um pedido aqui para entregar)"
        style={{
          backgroundColor: isOver ? "var(--red-900)" : "var(--dark-900)",
          borderColor: isOver ? "var(--red-900)" : "var(--gray-100)",
          color: isOver ? "var(--white)" : "var(--gray-100)",
          transform: isOver ? "scale(1.05)" : "scale(1)",
          transition: "all 0.2s",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
        }}
      >
        <FiCheckCircle size={20} />
        <span>Entregues</span>
      </button>
    );
  }

  function HeaderDropZone({ children }: { readonly children: (isOver: boolean) => React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
      id: "finish-button",
    });

    return (
      <div
        ref={setNodeRef}
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        {children(isOver)}
      </div>
    );
  }

  function SortableOrderItem({ order, isReady }: { readonly order: OrderItem; readonly isReady: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: order.id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <section ref={setNodeRef} style={style} className={styles.orderItem}>
        <button
          {...attributes}
          {...listeners}
          onClick={() => handleOpenModalView(order.id)}
          className={styles.orderButton}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <div className={isReady ? `${styles.tag} ${styles.tagReady}` : styles.tag}></div>
          <div className={styles.listOrdersContainer}>
            <div className={styles.listOrdersHeader}>
              <span>
                <span className={styles.tableLabel}>{order.table}</span>
              </span>
            </div>
            <div className={styles.listOrdersBody}>
              {order.details.orderItems.map((item) => {
                // Montar o nome completo do produto
                let productDisplayName = item.product.name;

                // Se tiver espetinho escolhido, adicionar "de [espetinho]"
                if (item.meatChoice) {
                  productDisplayName = `${item.product.name} de ${item.meatChoice.name}`;
                }

                // Se tiver ponto da carne, adicionar " - [ponto]"
                if (item.meatPoint) {
                  productDisplayName += ` - ${item.meatPoint}`;
                }

                return (
                  <div
                    key={item.id}
                    className={`${styles.product} ${item.takenToTable ? styles.productTaken : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleItemTakenToTable(item.id, item.takenToTable || false);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.takenToTable || false}
                      onChange={() => handleToggleItemTakenToTable(item.id, item.takenToTable || false)}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.itemCheckbox}
                    />
                    <div className={styles.productContent}>
                      <span className={styles.productName}>
                        {item.amount}x {productDisplayName}
                      </span>
                      <div className={styles.productDetail}>
                        {item.removals && item.removals.length > 0 && (
                          <span className={styles.detailItem}>❌ Sem: {item.removals.join(", ")}</span>
                        )}
                        {item.additions && item.additions.length > 0 && (
                          <span className={styles.detailItem}>➕ Adicionais: {item.additions.map((a) => a.addon.name).join(", ")}</span>
                        )}
                        {item.notes && <span className={styles.detailItem}>Obs: {item.notes}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </button>
        <button
          className={styles.editButton}
          onClick={(e) => {
            e.stopPropagation();
            handleEditOrder(order);
          }}
          title="Editar pedido"
        >
          <FiEdit2 size={14} />
        </button>
      </section>
    );
  }

  return (
    <>
      <Head>
        <title>Painel - Espetinho Casanova</title>
      </Head>
      <div className={styles.page}>
        <Header />

        <main className={styles.container}>
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <HeaderDropZone>
              {(isOver) => (
                <div className={styles.pageHeader}>
                  <div className={styles.titleRow}>
                    <h1>Pedidos</h1>
                    <span className={styles.count}>
                      {orderList.length} {orderList.length === 1 ? "pedido" : "pedidos"}
                    </span>
                    <div className={styles.headerActions}>
                      <button
                        type="button"
                        className={styles.refreshButton}
                        onClick={handleOpenWaitingQueueModal}
                        title="Gerenciar fila de espera"
                        style={{
                          backgroundColor: "var(--dark-900)",
                          borderColor: "var(--gray-100)",
                          color: "var(--gray-100)",
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <FiUsers size={20} />
                        <span>Fila de Espera</span>
                      </button>
                      <FinishButtonDropZone onOpenModal={handleOpenFinishedOrdersModal} isOver={isOver} />
                    </div>
                  </div>
                </div>
              )}
            </HeaderDropZone>

            <div className={styles.ordersContainer}>
              {/* Coluna: Em Preparação */}
              <DroppableColumn id="preparation-column">
                <div className={styles.sectionHeader}>
                  <h2>Em Preparação</h2>
                  <span className={styles.count}>
                    {ordersInPreparation.length} {ordersInPreparation.length === 1 ? "pedido" : "pedidos"}
                  </span>
                </div>
                <SortableContext
                  id="preparation-column"
                  items={ordersInPreparation.map((order) => order.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <article className={styles.listOrders}>
                    {ordersInPreparation.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p>Nenhum pedido em preparação</p>
                      </div>
                    ) : (
                      ordersInPreparation.map((order) => <SortableOrderItem key={order.id} order={order} isReady={false} />)
                    )}
                  </article>
                </SortableContext>
              </DroppableColumn>

              {/* Coluna: Prontos */}
              <DroppableColumn id="ready-column">
                <div className={styles.sectionHeader}>
                  <h2>Prontos</h2>
                  <span className={styles.count}>
                    {ordersReady.length} {ordersReady.length === 1 ? "pedido" : "pedidos"}
                  </span>
                </div>
                <SortableContext id="ready-column" items={ordersReady.map((order) => order.id)} strategy={verticalListSortingStrategy}>
                  <article className={styles.listOrders}>
                    {ordersReady.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p>Nenhum pedido pronto</p>
                      </div>
                    ) : (
                      ordersReady.map((order) => <SortableOrderItem key={order.id} order={order} isReady={true} />)
                    )}
                  </article>
                </SortableContext>
              </DroppableColumn>
            </div>
            <DragOverlay>
              {activeId ? (
                <div className={styles.orderItem} style={{ opacity: 0.5 }}>
                  <div className={styles.tag}></div>
                  <div className={styles.listOrdersContainer}>
                    <div className={styles.listOrdersHeader}>
                      <span>Arrastando...</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>

        {modalVisible && orderItemDetails && (
          <ModalOrder
            isOpen={modalVisible}
            onRequestClose={handleCloseModal}
            order={orderItemDetails}
            handleFinishOrder={handleFinishItem}
            handleMarkAsReady={handleMarkAsReady}
          />
        )}

        {/* Modal de Edição do Carrinho */}
        <Modal
          isOpen={editCartModalOpen}
          onRequestClose={() => setEditCartModalOpen(false)}
          style={{
            content: {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#1d1d2e",
              padding: "0",
              maxWidth: "95%",
              maxHeight: "90vh",
              width: "600px",
              borderRadius: "8px",
              overflow: "hidden",
              zIndex: 1004,
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              zIndex: 1003,
            },
          }}
        >
          <div className={styles.cartModal}>
            <div className={styles.cartHeader}>
              <div className={styles.headerLeft}>
                <h2>Editar Pedido</h2>
              </div>
              <button type="button" onClick={() => setEditCartModalOpen(false)} className={styles.closeButton}>
                <FiX size={22} color="#f34748" />
              </button>
            </div>

            <div className={styles.cartContent}>
              {/* Input de Mesa/Nome (apenas em mobile) */}
              <div className={styles.orderInfo}>
                <input
                  type="text"
                  placeholder="Mesa/Nome *"
                  value={editingTableName}
                  onChange={(e) => setEditingTableName(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              {/* Botão para Adicionar Novo Item */}
              <div style={{ marginBottom: "1rem" }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (categories.length === 0) {
                      await loadCategoriesAndProducts();
                    }
                    setProductModalOpen(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "var(--green-900)",
                    color: "var(--dark-700)",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FiPlus size={20} />
                  Adicionar Item
                </button>
              </div>

              {/* Lista de Itens */}
              <div className={styles.cartItems}>
                {editingCart.map((item, index) => (
                  <div key={`${item.product.id}-${index}`} className={styles.cartItem}>
                    <div className={styles.cartItemHeader}>
                      <div className={styles.headerContent}>
                        <div className={styles.itemPrice}>R$ {item.total.toFixed(2)}</div>
                        <h4>
                          {item.product.name}
                          {item.meatChoice && <span className={styles.meatChoiceLabel}> + {item.meatChoice.name}</span>}
                          {item.meatPoint && <span className={styles.meatPointLabel}> - {item.meatPoint}</span>}
                        </h4>
                      </div>
                      <button type="button" onClick={() => handleRemoveFromCart(index)} className={styles.removeButton}>
                        <FiTrash2 size={18} />
                      </button>
                    </div>

                    {/* Detalhes do Item */}
                    <div className={styles.cartItemDetails}>
                      {item.removals && item.removals.length > 0 && (
                        <p>
                          <strong>❌ Remover:</strong> {item.removals.join(", ")}
                        </p>
                      )}
                      {item.additions && item.additions.length > 0 && (
                        <p>
                          <strong>➕ Adicionais:</strong> {item.additions.map((a) => `${a.name} (${a.quantity}x)`).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Quantidade e Observação na mesma linha */}
                    <div className={styles.cartItemBottom}>
                      {/* Controle de Quantidade */}
                      <div className={styles.cartItemQuantity}>
                        <div className={styles.quantityControls}>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQuantity(index, item.amount - 1)}
                            className={styles.qtyButton}
                          >
                            <FiMinus size={16} />
                          </button>
                          <span className={styles.qtyValue}>{item.amount}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQuantity(index, item.amount + 1)}
                            className={styles.qtyButton}
                          >
                            <FiPlus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Observações */}
                      <div className={styles.cartItemNotes}>
                        {editingNoteIndex === index ? (
                          <div className={styles.noteEdit}>
                            <input
                              type="text"
                              value={editingNoteValue}
                              onChange={(e) => setEditingNoteValue(e.target.value)}
                              onBlur={() => handleUpdateCartItemNote(index, editingNoteValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleUpdateCartItemNote(index, editingNoteValue);
                                }
                              }}
                              className={styles.noteInput}
                              placeholder="Observação..."
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className={styles.noteDisplay}>
                            <span>{item.notes || "Sem obs"}</span>
                            <button type="button" onClick={() => startEditingNote(index, item.notes)} className={styles.editNoteButton}>
                              <FiEdit2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer com Total e Botão */}
            <div className={styles.cartFooter}>
              <div className={styles.cartTotalPrice}>
                <span>Total</span>
                <strong>R$ {calculateCartTotal().toFixed(2)}</strong>
              </div>
              <button className={styles.finishButton} onClick={handleFinishEditOrder}>
                Salvar Alterações
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de Pedidos Entregues */}
        <Modal
          isOpen={finishedOrdersModalOpen}
          onRequestClose={() => setFinishedOrdersModalOpen(false)}
          style={{
            content: {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#1d1d2e",
              padding: "0",
              maxWidth: "95%",
              maxHeight: "90vh",
              width: "800px",
              borderRadius: "8px",
              overflow: "hidden",
              zIndex: 1000,
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              zIndex: 999,
            },
          }}
        >
          <div className={styles.cartModal}>
            <div className={styles.cartHeader}>
              <h2>Pedidos Entregues</h2>
              <button type="button" onClick={() => setFinishedOrdersModalOpen(false)} className={styles.closeButton}>
                <FiX size={22} color="#f34748" />
              </button>
            </div>

            <div className={styles.cartContent}>
              {finishedOrders.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Nenhum pedido entregue</p>
                </div>
              ) : (
                <div className={styles.cartItems}>
                  {finishedOrders.map((order) => (
                    <div key={order.id} className={styles.cartItem}>
                      <div className={styles.cartItemHeader}>
                        <div className={styles.finishedOrderHeader}>
                          <h4 style={{ margin: 0 }}>{order.table}</h4>
                          <div className={styles.finishedOrderInfo}>
                            <div className={styles.finishedOrderTimes}>
                              <span>
                                Criado:{" "}
                                {new Date(order.createdAt || Date.now()).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>
                                Entregue:{" "}
                                {new Date(order.updatedAt || Date.now()).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleReturnToReady(order.id)}
                              style={{
                                background: "var(--green-900)",
                                border: "none",
                                borderRadius: "4px",
                                padding: "0.375rem 0.75rem",
                                color: "var(--dark-700)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                transition: "all 0.2s",
                                height: "fit-content",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#35e694";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--green-900)";
                              }}
                              title="Retornar pedido para 'Prontos'"
                              className={styles.returnButton}
                            >
                              <FiRotateCw size={16} />
                              <span className={styles.returnButtonText}>Retornar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className={styles.cartItemDetails}>
                        {order.details?.orderItems?.map((item: ItemProps) => {
                          let productDisplayName = item.product.name;
                          if (item.meatChoice) {
                            productDisplayName = `${item.product.name} de ${item.meatChoice.name}`;
                          }
                          if (item.meatPoint) {
                            productDisplayName += ` - ${item.meatPoint}`;
                          }
                          return (
                            <div key={item.id} className={styles.finishedOrderItem}>
                              <div className={styles.finishedOrderItemMain}>
                                <strong>
                                  {item.amount}x {productDisplayName}
                                </strong>
                                {item.additions && item.additions.length > 0 && (
                                  <span className={styles.finishedOrderItemAdditions}>
                                    ➕ Adc: {item.additions.map((a) => a.addon.name).join(", ")}
                                  </span>
                                )}
                              </div>
                              {item.removals && item.removals.length > 0 && (
                                <div className={styles.finishedOrderItemRemovals}>❌ Sem: {item.removals.join(", ")}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* Modal de Fila de Espera */}
        <Modal
          isOpen={waitingQueueModalOpen}
          onRequestClose={() => setWaitingQueueModalOpen(false)}
          style={{
            content: {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#1d1d2e",
              padding: "0",
              maxWidth: "95%",
              maxHeight: "90vh",
              width: "600px",
              borderRadius: "8px",
              overflow: "hidden",
              zIndex: 1000,
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              zIndex: 999,
            },
          }}
        >
          <div className={styles.cartModal}>
            <div className={styles.cartHeader}>
              <h2>Fila de Espera</h2>
              <button type="button" onClick={() => setWaitingQueueModalOpen(false)} className={styles.closeButton}>
                <FiX size={22} color="#f34748" />
              </button>
            </div>

            <div className={styles.cartContent}>
              {/* Header com input e botão */}
              <div className={styles.waitingQueueHeader}>
                <input
                  type="text"
                  placeholder="Nome da pessoa"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPersonName.trim()) {
                      handleAddToWaitingQueue();
                    }
                  }}
                  className={styles.waitingQueueInput}
                />
                <button
                  type="button"
                  onClick={handleAddToWaitingQueue}
                  className={styles.waitingQueueAddButton}
                  disabled={!newPersonName.trim()}
                >
                  <FiPlus size={20} />
                </button>
              </div>

              {/* Lista de pessoas */}
              {waitingQueue.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Nenhuma pessoa na fila</p>
                </div>
              ) : (
                <div className={styles.waitingQueueList}>
                  {waitingQueue.map((person) => (
                    <div key={person.id} className={styles.waitingQueueItem}>
                      <div className={styles.waitingQueueItemInfo}>
                        <h4>{person.name}</h4>
                        <span className={styles.waitingQueueTime}>
                          {new Date(person.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromWaitingQueue(person.id)}
                        className={styles.waitingQueueRemoveButton}
                        title="Remover da fila"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* Modal de Seleção de Categoria e Produto */}
        <Modal
          isOpen={productModalOpen && selectedProduct === null}
          onRequestClose={() => setProductModalOpen(false)}
          style={{
            content: {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#1d1d2e",
              padding: "1.5rem",
              maxWidth: "95%",
              maxHeight: "90vh",
              width: "800px",
              borderRadius: "8px",
              overflow: "auto",
              zIndex: 1006,
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              zIndex: 1005,
            },
          }}
        >
          <div style={{ color: "var(--white)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0 }}>Adicionar Item</h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#f34748",
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Abas de Categorias */}
            {categories.length > 0 && (
              <div className={styles.categoryTabsContainer}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category);
                      fetchProductsByCategory(category.id);
                    }}
                    style={{
                      padding: "1rem 2rem",
                      backgroundColor: selectedCategory?.id === category.id ? "var(--green-900)" : "var(--dark-900)",
                      color: selectedCategory?.id === category.id ? "var(--dark-700)" : "var(--white)",
                      border: `2px solid ${selectedCategory?.id === category.id ? "var(--green-900)" : "var(--gray-100)"}`,
                      borderRadius: "8px",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    {category.categoryName}
                  </button>
                ))}
              </div>
            )}

            {/* Grade de Produtos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "1rem",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {products.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem", color: "var(--gray-100)" }}>
                  {categories.length === 0 ? "Carregando categorias..." : "Nenhum produto disponível"}
                </div>
              ) : (
                products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductClick(product)}
                    disabled={!product.available}
                    style={{
                      padding: "1rem",
                      backgroundColor: product.available ? "var(--dark-900)" : "var(--dark-800)",
                      color: product.available ? "var(--white)" : "var(--gray-100)",
                      border: `2px solid ${product.available ? "var(--gray-100)" : "var(--gray-200)"}`,
                      borderRadius: "8px",
                      cursor: product.available ? "pointer" : "not-allowed",
                      opacity: product.available ? 1 : 0.6,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>{product.name}</div>
                    <div style={{ color: "var(--green-900)", fontWeight: "bold" }}>
                      R$ {Number.parseFloat(String(product.price)).toFixed(2)}
                    </div>
                    {!product.available && <div style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Indisponível</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>

        {/* Modal de Detalhes do Produto */}
        {selectedProduct && (
          <ModalProductDetail
            isOpen={selectedProduct !== null}
            onRequestClose={() => {
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            isComplexProduct={isComplexProduct(selectedProduct)}
          />
        )}

        {/* Botão Flutuante para Novo Pedido (PDV) */}
        <Link href="/pdv" className={styles.fabButton}>
          <FiPlus size={24} />
          <span>Novo Pedido</span>
        </Link>
      </div>
    </>
  );
}

export const getServerSideProps = canSSRAuth(async (context) => {
  const apiClient = setupApiClient(context);

  const response = await apiClient.get("/orders");
  const orders = response.data; // Lista de pedidos

  // Aqui, vamos percorrer a lista de pedidos e fazer outra busca para cada id de pedido
  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => {
      // Aqui, fazemos a busca detalhada com base no id de cada pedido
      const detailedResponse = await apiClient.get(`/order/detail`, {
        params: {
          orderId: order.id,
        },
      });

      // Retornamos um novo objeto que combina as informações do pedido e seus detalhes
      return {
        ...order,
        details: detailedResponse.data,
      };
    })
  );

  return {
    props: {
      orders: ordersWithDetails,
    },
  };
});
