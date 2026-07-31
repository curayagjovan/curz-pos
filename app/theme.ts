import { createTheme } from "@mui/material/styles";

const easeIOS = "cubic-bezier(0.32, 0.72, 0, 1)";

const appTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#007aff" },
        secondary: { main: "#5856d6" },
        success: { main: "#34c759" },
        error: { main: "#ff3b30" },
        warning: { main: "#ff9500" },
        info: { main: "#32ade6" },
        background: {
          default: "#f2f2f7",
          paper: "#ffffff",
        },
        text: {
          primary: "#1c1c1e",
          secondary: "rgba(60, 60, 67, 0.6)",
        },
        divider: "rgba(60, 60, 67, 0.12)",
      },
    },
    dark: {
      palette: {
        primary: { main: "#0a84ff" },
        secondary: { main: "#5e5ce6" },
        success: { main: "#30d158" },
        error: { main: "#ff453a" },
        warning: { main: "#ff9f0a" },
        info: { main: "#64d2ff" },
        background: {
          default: "#000000",
          paper: "#1c1c1e",
        },
        text: {
          primary: "#ffffff",
          secondary: "rgba(235, 235, 245, 0.6)",
        },
        divider: "rgba(84, 84, 88, 0.42)",
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
  transitions: {
    easing: {
      easeOut: easeIOS,
      easeInOut: easeIOS,
    },
    duration: {
      enteringScreen: 300,
      leavingScreen: 240,
    },
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
    h4: {
      fontSize: "2.125rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.18,
    },
    h6: {
      fontSize: "1.0625rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    subtitle1: {
      fontWeight: 600,
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
          WebkitFontSmoothing: "antialiased",
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
          backgroundColor:
            "rgba(var(--mui-palette-background-defaultChannel) / 0.82)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
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
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          "&.MuiPaper-outlined": {
            border: "none",
          },
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          transition: `background-color 180ms ${easeIOS}`,
          "&:active": {
            backgroundColor: "var(--mui-palette-action-selected)",
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          transition: `transform 160ms ${easeIOS}, opacity 160ms ${easeIOS}, background-color 160ms ${easeIOS}, border-color 160ms ${easeIOS}, color 160ms ${easeIOS}`,
          "&:active": {
            transform: "scale(0.97)",
            opacity: 0.85,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: `transform 160ms ${easeIOS}, opacity 160ms ${easeIOS}`,
          "&:active": {
            transform: "scale(0.92)",
            opacity: 0.7,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 10px 26px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.14)",
          transition: `transform 180ms ${easeIOS}, box-shadow 240ms ${easeIOS}`,
          "&:active": {
            transform: "scale(0.94)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          transition: `background-color 160ms ${easeIOS}, transform 160ms ${easeIOS}`,
        },
        clickable: {
          "&:active": {
            transform: "scale(0.96)",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paperAnchorBottom: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          "&::before": {
            content: '""',
            position: "absolute",
            top: 7,
            left: "50%",
            transform: "translateX(-50%)",
            width: 36,
            height: 5,
            borderRadius: 999,
            backgroundColor:
              "rgba(var(--mui-palette-text-primaryChannel) / 0.18)",
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          paddingTop: 8,
          paddingBottom: 10,
          transition: `color 200ms ${easeIOS}`,
          "& .MuiSvgIcon-root": {
            transition: `transform 200ms ${easeIOS}`,
          },
          "&.Mui-selected .MuiSvgIcon-root": {
            transform: "scale(1.12)",
          },
        },
        label: {
          fontSize: 11,
          fontWeight: 600,
          "&.Mui-selected": {
            fontSize: 11,
          },
        },
      },
    },
  },
});

export default appTheme;
