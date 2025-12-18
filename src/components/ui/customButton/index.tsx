import React, { ReactNode } from "react";
import Button, { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

interface ButtonProps extends MuiButtonProps {
  loading?: boolean;
  children: ReactNode;
}

export function CustomButton({ loading, children, color, ...rest }: ButtonProps) {
  return (
    <Button
      {...rest}
      disabled={loading}
      color={color}
      sx={
        {
          // transition: 'filter 0.1s',
          // '&[disabled]': {
          //   cursor: 'wait',
          //   '& svg': {
          //     animation: 'animate 2s infinite',
          //   },
          // },
          // '@keyframes animate': {
          //   from: {
          //     transform: 'rotate(0deg)',
          //   },
          //   to: {
          //     transform: 'rotate(360deg)',
          //   },
          // },
        }
      }
    >
      {loading ? <CircularProgress color={color} size={20} /> : children}
    </Button>
  );
}
