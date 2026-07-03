import { createTheme } from "@mui/material/styles";

const appTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#0b6bcb",
        },
        background: {
          default: "#f8fafc",
          paper: "#ffffff",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#5aa8ff",
        },
        background: {
          default: "#0b0f16",
          paper: "#131a24",
        },
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
    h6: {
      fontSize: "1.125rem",
      fontWeight: 700,
    },
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        },
        body: {
          overscrollBehavior: "none",
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        color: "inherit",
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backdropFilter: "saturate(160%) blur(10px)",
          WebkitBackdropFilter: "saturate(160%) blur(10px)",
          backgroundColor:
            "rgba(var(--mui-palette-background-paperChannel) / 0.88)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor:
            "rgba(var(--mui-palette-background-paperChannel) / 0.95)",
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          paddingTop: 8,
          paddingBottom: 10,
        },
        label: {
          fontSize: 11,
          fontWeight: 600,
        },
      },
    },
  },
});

export default appTheme;
