import { useState } from "react";
import Head from "next/head";
import styles from "./styles.module.scss";
import { Header } from "../../components/Header";
import { canSSRAuth } from "../../utils/canSSRAuth";

import { FiPlus, FiTrash, FiEdit, FiPlusSquare } from "react-icons/fi";
import { CategoryProps } from "../product";

import { setupApiClient } from "../../services/api";

import { ModalCreateOrder } from "../../components/ModalCreateOrder";

import Modal from "react-modal";
import { toast } from "react-toastify";
import Router from "next/router";
import { CustomButton } from "../../components/ui/customButton";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { DeleteOutlineOutlined, EditOutlined } from "@mui/icons-material";

export default function newOrder({ categoryList }: CategoryProps) {
  const [categories, setCategories] = useState({
    categoryList: categoryList || [],
  });

  const fetchOrders = async () => {
    const apiClient = setupApiClient();
    try {
      const response = await apiClient.get("/orders");
      return response.data; // Retorna a lista de pedidos
    } catch (error) {
      console.log("Erro ao buscar produtos por categoria ", error);
      return []; // Retorna uma lista vazia em caso de erro
    }
  };

  const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: "center",
    color: theme.palette.text.secondary,
  }));

  Modal.setAppElement("#__next");

  const orderItens = [{ nome: "Espetinho" }, { nome: "Ka churrasco" }, { nome: "XIs" }, { nome: "Espetinho" }];

  return (
    <>
      <Head>
        <title>Novo Pedido - Espetinho Casanova </title>
      </Head>

      {/* <div> */}
      <Header />
      <Card className={styles.container}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <CardHeader title="Novo pedido" />
          </Box>
          <Box>
            <IconButton size="large" color="success">
              <FiPlusSquare />
            </IconButton>
          </Box>

          {/* <button
              className={styles.customLink}
              onClick={() => handleOpenModalView({ categoryList })}
            >
              <FiPlus
                size={35}
                color="#3fffa3"
                style={{ backgroundColor: "transparent" }}
              />
            </button> */}
        </Box>
        <CardContent sx={{ pt: 0 }}>
          <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
            <Grid item xs={6}>
              <TextField
                id="filled-basic"
                label="Numero ou Nome"
                variant="filled"
                placeholder=""
                fullWidth
                InputLabelProps={{ shrink: true }}
                color="error"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                id="filled-basic"
                label="Identificação do cliente"
                variant="filled"
                placeholder=""
                fullWidth
                InputLabelProps={{ shrink: true }}
                color="error"
              />
            </Grid>
            <Grid
              item
              xs={12}
              sx={{
                "&.MuiGrid-item": {
                  pt: "24px",
                },
              }}
            >
              <Paper elevation={0}>
                <TableContainer>
                  <Table>
                    <TableBody>
                      {orderItens.map((item) => (
                        <TableRow key={item.nome}>
                          <TableCell sx={{ p: "4px", pl: "16px" }}>{item.nome}</TableCell>
                          <TableCell padding="none" align="center" width={"35px"}>
                            <Box>
                              <IconButton size="large" color="success" sx={{ p: "4px" }}>
                                <EditOutlined sx={{ maxWidth: "20px", maxHeight: "20px" }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell align="center" width={"35px"} sx={{ p: 0, pr: "16px" }}>
                            <Box>
                              <IconButton size="large" color="error" sx={{ p: "4px" }}>
                                <DeleteOutlineOutlined sx={{ maxWidth: "20px", maxHeight: "20px" }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>

        <CardActions sx={{ p: "8px 16px" }}>
          <CustomButton fullWidth variant="contained" color="error" href="#outlined-buttons" loading={false} sx={{}} size="large">
            Abrir mesa
          </CustomButton>
        </CardActions>
      </Card>
    </>
  );
}

export const getServerSideProps = canSSRAuth(async (context) => {
  const apiClient = setupApiClient(context);

  const response = await apiClient.get("/categories");

  return {
    props: {
      categoryList: response.data,
    },
  };
});
