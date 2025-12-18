import "../../styles/globals.scss";
import { AppProps } from "next/app";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import theme from "../styles/theme/index";
import { AuthProvider } from "../contexts/AuthContext";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Criar QueryClient com configurações padrão
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2 minutos
        cacheTime: 5 * 60 * 1000, // 5 minutos
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: sempre criar novo QueryClient
    return makeQueryClient();
  } else {
    // Browser: usar singleton para manter cache entre navegações
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Component {...pageProps} />
          <ToastContainer
            className="toast-position"
            autoClose={3500}
            closeOnClick
            limit={2}
            newestOnTop
            hideProgressBar
            position="top-right"
          />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default MyApp;
