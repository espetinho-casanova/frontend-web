import Modal from "react-modal";
import styles from "./styles.module.scss";
import { FiX } from "react-icons/fi";
import { useState, useEffect } from "react";
import { CategoryProps } from "../../pages/product";

import { setupApiClient } from "../../services/api";
import { Radio } from "../ui/Radio";
import { Checkbox } from "../ui/Checkbox";
import { CustomButton } from "../ui/customButton";

interface ModalOrderProps {
  isOpen: boolean;
  onSubmit: (productsInfo: ProductsInfo) => void;
  onRequestClose: () => void;
  categories: CategoryProps;
  editing: boolean;
  product: ProductsInfo;
  editIndex: number;
  client: string;
}

type ProductsInfo = {
  product: productsProps;
  categoryIndex: number;
  productIndex: number;
  quantity: number;
  details: Detail[];
  client: string;
};

type Detail = {
  id: number;
  value:
    | "mal"
    | "ao ponto pra mal"
    | "ao ponto pra bem"
    | "bem";
  extra: string[];
  removedIngredients: string[];
};

type productsProps = {
  name: string;
  description: string;
  price: string;
  available: boolean;
  banner: string;
  id: string;
  categoryId: string;
};

export function ModalCreateOrder({
  isOpen,
  onSubmit,
  onRequestClose,
  categories,
  editing,
  product,
  editIndex,
  client,
}: ModalOrderProps) {
  const [productList, setProductsList] = useState([]);
  const [productSelected, setProductSelected] = useState(0);
  const [categorySelected, setCategorySelected] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentClient, setCurrentClient] = useState("");

  useEffect(() => {
    if (categorySelected !== null) {
      fetchProductsByCategory(categories.categoryList[categorySelected].id);
      setCurrentClient(client);

      if (editing === true && product !== null) {
        fetchProductsByCategory(product.product.categoryId);

        setCategorySelected(product.categoryIndex);
        setProductSelected(product.productIndex);
        setQuantity(product.quantity);
        setDetails(product.details);
        setCurrentClient(product.client);
      } else {
        refreshDetailList(quantity);
      }
    }
  }, []);

  const fetchProductsByCategory = async (categoryId: string) => {
    setLoading(true);
    const apiClient = setupApiClient();

    try {
      const response = await apiClient.get("/category/product", {
        params: {
          categoryId: categoryId,
        },
      });

      setProductsList(response.data);
    } catch (error) {
      // Erro silencioso
    }
    setLoading(false);
  };

  function refreshDetailList(quantity: number) {
    setDetails((prevDetails) => {
      const updatedDetails = [...prevDetails];
      if (quantity > updatedDetails.length) {
        const additionalDetails = Array.from(
          { length: quantity - updatedDetails.length },
          (_, index) => ({
            id: updatedDetails.length + index,
            value: "ao ponto",
            extra: [],
            removedIngredients: [],
          })
        );
        updatedDetails.push(...additionalDetails);
      } else if (quantity < updatedDetails.length) {
        updatedDetails.splice(quantity, updatedDetails.length - quantity);
      }
      return updatedDetails;
    });
  }

  function handleChangeCategory(event) {
    setCategorySelected(event.target.value);
    fetchProductsByCategory(categories.categoryList[event.target.value].id);
  }

  function handleChangeProduct(event) {
    setProductSelected(event.target.value);
  }

  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = Number(event.target.value);

    if (newQuantity >= 1) {
      if (newQuantity <= 10) {
        setQuantity(newQuantity);
        refreshDetailList(newQuantity);
      } else {
        setQuantity(10);
        refreshDetailList(10);
      }
    } else {
      setQuantity(1);
      refreshDetailList(1);
    }
  };

  const handleDetailChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    detailId: number
  ) => {
    const { value } = event.target;
    setDetails((prevDetails) => {
      const updatedDetails = prevDetails.map((detail) => {
        if (detail.id === detailId) {
          return {
            ...detail,
            value: value === detail.value ? "ao ponto" : value,
          };
        }
        return detail;
      });
      return updatedDetails;
    });
  };

  const handleIngredientChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    detailId: number
  ) => {
    const { value, checked } = event.target;
    setDetails((prevDetails) => {
      const updatedDetails = prevDetails.map((detail) => {
        if (detail.id === detailId) {
          return {
            ...detail,
            removedIngredients: checked
              ? [...detail.removedIngredients, value]
              : detail.removedIngredients.filter((i) => i !== value),
          };
        }
        return detail;
      });
      return updatedDetails;
    });
  }; 
  

  const handleExtraChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    detailId: number,
    option: string
  ) => {
    const { checked } = event.target;
    setDetails((prevDetails) => {
      const updatedDetails = prevDetails.map((detail) => {
        if (detail.id === detailId) {
          return {
            ...detail,
            extra: checked
              ? [...detail.extra, option]
              : detail.extra.filter((item) => item !== option),
          };
        }
        return detail;
      });
      return updatedDetails;
    });
  };

  const customStyles = {
    content: {
      top: "50%",
      bottom: "auto",
      left: "50%",
      right: "auto",
      padding: "30px",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#1d1d2e",
    },
  };

  function handleFormSubmit(event) {
    event.preventDefault();
    const product = productList[productSelected];

    if (editing === true && editIndex !== null) {
      // Se estiver editando, substitua o item no array productsList
      setProductsList((prevList) => {
        const newList = [...prevList];
        newList[editIndex] = productsInfo;
        return newList;
      });
    }

    const productsInfo: ProductsInfo = {
      productIndex: productSelected,
      categoryIndex: categorySelected,
      product,
      quantity,
      details,
      client: currentClient,
    };

    onSubmit(productsInfo);

    onRequestClose();
  }

  const categoryName = categories.categoryList[categorySelected].categoryName;

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={customStyles}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Criar Pedido</h2>
          <button
            type="button"
            onClick={onRequestClose}
            className="react-modal-close"
            style={{ background: "transparent", border: 0 }}
          >
            <FiX size={45} color="#f34748" />
          </button>
        </div>

        <div className={styles.mainContainer}>
          <form className={styles.form} onSubmit={handleFormSubmit}>
            <div className={styles.input}>
              <select
                value={categorySelected}
                onChange={(event) => handleChangeCategory(event)}
              >
                {categories.categoryList.map((item, index) => {
                  return (
                    <option key={item.id} value={index}>
                      {item.categoryName}
                    </option>
                  );
                })}
              </select>

              <select value={productSelected} onChange={handleChangeProduct}>
                {productList.length === 0 ? (
                  <option>Nenhum produto!</option>
                ) : (
                  productList.map((item, index) => (
                    <option key={item.id} value={index}>
                      {item.name}
                    </option>
                  ))
                )}
              </select>

              <input
                type="number"
                placeholder="Quantidade"
                value={quantity}
                onChange={(event) => handleQuantityChange(event)}
              />
            </div>

            <div className={styles.detailContainer}>
              {details.map((detail, index) => (
                <div key={index} className={styles.detailArea}>
                  <div className={styles.detailTitle}>
                    <h2>item {detail.id + 1}</h2>
                  </div>

                  <div className={styles.radioContainer}>
                    <h3>Ponto da Carne</h3>

                    <div className={styles.radioArea}>
                      <Radio
                        value="mal"
                        checked={detail.value.includes("mal")}
                        onChange={(event) =>
                          handleDetailChange(event, detail.id)
                        }
                        label="Mal"
                      />

                      <Radio
                        value=". pra mal"
                        checked={detail.value.includes(". pra mal")}
                        onChange={(event) =>
                          handleDetailChange(event, detail.id)
                        }
                        label="Ponto para mal"
                      />

                      <Radio
                        value="ao ponto"
                        checked={detail.value.includes("ao ponto")}
                        onChange={(event) =>
                          handleDetailChange(event, detail.id)
                        }
                        label="Ao ponto"
                      />

                      <Radio
                        value=". pra bem"
                        checked={detail.value.includes(". pra bem")}
                        onChange={(event) =>
                          handleDetailChange(event, detail.id)
                        }
                        label="Ponto para bem"
                      />

                      <Radio
                        value="bem"
                        checked={detail.value.includes("bem")}
                        onChange={(event) =>
                          handleDetailChange(event, detail.id)
                        }
                        label="Bem"
                      />
                    </div>
                  </div>

                  <div className={styles.checkboxContainer}>
                    <h3>Extras</h3>
                    <div className={styles.checkboxArea} key={categorySelected}>
                      {categoryName !== "Espetinho" &&
                      categoryName !== "Bebidas" ? (
                        <>
                          <Checkbox
                            value="prensado"
                            checked={detail.removedIngredients.includes(
                              "prensado"
                            )}
                            onChange={(event) =>
                              handleIngredientChange(event, detail.id)
                            }
                            label="Prensado"
                          />
                          <Checkbox
                            value="com_ovo"
                            checked={detail.removedIngredients.includes(
                              "com_ovo"
                            )}
                            onChange={(event) =>
                              handleIngredientChange(event, detail.id)
                            }
                            label="Com Ovo"
                          />
                          <div className={styles.checkboxArea}>
                            <Checkbox
                              value="completo"
                              checked={detail.extra.includes("completo")}
                              onChange={(event) =>
                                handleExtraChange(event, detail.id, "completo")
                              }
                              label="Completo"
                            />
                          </div>
                        </>
                      ) : null}

                      <Checkbox
                        value="para levar"
                        checked={detail.extra.includes("para levar")}
                        onChange={(event) =>
                          handleExtraChange(event, detail.id, "para levar")
                        }
                        label="Para Levar"
                      />
                    </div>
                  </div>

                  {categoryName === "Espetinho" &&
                  detail.extra.includes("para levar") ? (
                    <div className={styles.checkboxContainer}>
                      <h3>Quais ingredientes você deseja remover ?</h3>
                      <div className={styles.checkboxArea}>
                        <Checkbox
                          value="alho"
                          checked={detail.removedIngredients.includes("alho")}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Alho"
                        />

                        <Checkbox
                          value="pimenta"
                          checked={detail.removedIngredients.includes(
                            "pimenta"
                          )}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Pimenta"
                        />

                        <Checkbox
                          value="farofa"
                          checked={detail.removedIngredients.includes("farofa")}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Farofa"
                        />

                        <Checkbox
                          value="farinha"
                          checked={detail.removedIngredients.includes(
                            "farinha"
                          )}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Farinha Branca"
                        />
                        
                        <Checkbox
                          value="tudo"
                          checked={detail.removedIngredients.includes(
                            "tudo"
                          )}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Tudo"
                        />
                      </div>
                    </div>
                  ) : categoryName !== "Espetinho" &&
                    categoryName !== "Bebidas" &&
                    detail.extra.includes("completo") === false ? (
                    <div className={styles.checkboxContainer}>
                      <h3>Quais ingredientes você deseja remover ?</h3>
                      <div className={styles.checkboxArea}>
                        <Checkbox
                          value="maionese"
                          checked={detail.removedIngredients.includes(
                            "maionese"
                          )}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Maionese"
                        />

                        <Checkbox
                          value="queijo"
                          checked={detail.removedIngredients.includes("queijo")}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Queijo"
                        />

                        <Checkbox
                          value="cebola"
                          checked={detail.removedIngredients.includes("cebola")}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Cebola"
                        />

                        <Checkbox
                          value="alface"
                          checked={detail.removedIngredients.includes("alface")}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Alface"
                        />

                        <Checkbox
                          value="tomate"
                          checked={detail.removedIngredients.includes("tomate")}
                          onChange={(event) =>
                            handleIngredientChange(event, detail.id)
                          }
                          label="Tomate"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <CustomButton type="submit" loading={loading}>
              {editing ? "Salvar" : "Adicionar"}
            </CustomButton>
          </form>
        </div>
      </div>
    </Modal>
  );
}
