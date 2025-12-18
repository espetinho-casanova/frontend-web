import Modal from "react-modal";
import styles from "./styles.module.scss";
import { FiX } from "react-icons/fi";
import { OrderItemProps } from "../../pages/dashboard";
import Router from "next/router";
import { OrderStatus } from "../../utils/constants";

interface ModalOrderProps {
  isOpen: boolean;
  onRequestClose: () => void;
  order: OrderItemProps;
  handleFinishOrder: (id: string) => void;
  handleMarkAsReady?: (id: string) => void;
  onEdit?: (orderId: string) => void;
}

export function ModalOrder({ isOpen, onRequestClose, order, handleFinishOrder, handleMarkAsReady, onEdit }: Readonly<ModalOrderProps>) {
  const customStyles = {
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
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={customStyles}>
      <div className={styles.cartModal}>
        <div className={styles.cartHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTitleRow}>
              <h2>
                Detalhes do Pedido - <span className={styles.tableNumber}>{order.order.table}</span>
              </h2>
              <button type="button" onClick={onRequestClose} className={styles.closeButton}>
                <FiX size={22} color="#3fffa3" />
              </button>
            </div>
            {order.order.userName && (
              <div className={styles.waiterInfo}>
                Garçom: {order.order.userName}
              </div>
            )}
          </div>
        </div>

        <div className={styles.cartContent}>
          <div className={styles.cartItems}>
            {order.orderItems.map((item) => {
              return (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.cartItemHeader}>
                    <h4>
                      {item.amount}x {item.product.name}
                      {item.meatChoice && <span className={styles.meatChoiceLabel}> + {item.meatChoice.name}</span>}
                      {item.meatPoint && <span className={styles.meatPointLabel}> - {item.meatPoint}</span>}
                    </h4>
                  </div>

                  <div className={styles.cartItemDetails}>
                    {item.removals && item.removals.length > 0 && (
                      <p>
                        <strong>❌ Remover:</strong> {item.removals.join(", ")}
                      </p>
                    )}

                    {item.additions && item.additions.length > 0 && (
                      <p>
                        <strong>➕ Adicionais:</strong> {item.additions.map((a) => a.addon.name).join(", ")}
                      </p>
                    )}

                    {item.notes && (
                      <p>
                        <strong>📝 Observação:</strong> {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.cartFooter}>
          <div className={styles.buttonGroup}>
            {Number(order.order.status) === OrderStatus.IN_PREPARATION && handleMarkAsReady && (
              <button
                className={styles.buttonReady}
                onClick={() => {
                  handleMarkAsReady(order.order.id);
                  onRequestClose();
                }}
              >
                Marcar como Pronto
              </button>
            )}
            {Number(order.order.status) === OrderStatus.READY && (
              <button className={styles.buttonReady} onClick={() => handleFinishOrder(order.order.id)}>
                Marcar como Entregue
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
