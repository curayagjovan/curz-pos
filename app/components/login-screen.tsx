"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useAuth } from "@/app/context/auth-context";
import GoogleIcon from "@/app/components/google-icon";

export default function LoginScreen() {
  const { user, appUser, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut } =
    useAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return new URLSearchParams(window.location.search).get("authError")
      ? "Sign-in failed — please try again."
      : null;
  });
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("authError")
    ) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Signed in with Supabase, but no matching AppUser row (or deactivated).
  if (user && !appUser) {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h6">Account not authorized</Typography>
          <Typography variant="body2" color="text.secondary">
            Signed in as {user.email}, but this account hasn&apos;t been set
            up yet. Ask your Owner to add you as staff.
          </Typography>
          <Button variant="outlined" onClick={() => void signOut()}>
            Sign Out
          </Button>
        </Stack>
      </Container>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === "signUp" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signIn") {
        const { error: signInError } = await signInWithPassword(
          email.trim(),
          password,
        );
        if (signInError) {
          setError(signInError);
        }
      } else {
        const { error: signUpError } = await signUpWithPassword(
          email.trim(),
          password,
          fullName.trim(),
        );
        if (signUpError) {
          setError(signUpError);
        } else {
          setInfo(
            "Check your email to confirm your account. An Owner will still need to add you as staff before you can sign in.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        display: "flex",
        alignItems: "center",
        minHeight: "100dvh",
        py: 8,
      }}
    >
      <Stack spacing={2.5} sx={{ width: "100%" }}>
        <Box textAlign="center">
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            SHOPMAE
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === "signIn" ? "Sign in to continue" : "Create an account"}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="large"
          disabled={busy}
          onClick={() => void signInWithGoogle()}
          startIcon={<GoogleIcon />}
        >
          Continue with Google
        </Button>

        <Divider>or</Divider>

        <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
          <Stack spacing={1.5}>
            {mode === "signUp" ? (
              <TextField
                label="Full Name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                fullWidth
                size="small"
              />
            ) : null}
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={
                mode === "signIn" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
              size="small"
            />
            {mode === "signUp" ? (
              <TextField
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                fullWidth
                size="small"
              />
            ) : null}

            {error ? <Alert severity="error">{error}</Alert> : null}
            {info ? <Alert severity="success">{info}</Alert> : null}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              {mode === "signIn" ? "Sign In" : "Sign Up"}
            </Button>
          </Stack>
        </Box>

        <Button
          size="small"
          onClick={() => {
            setError(null);
            setInfo(null);
            setMode((current) => (current === "signIn" ? "signUp" : "signIn"));
          }}
        >
          {mode === "signIn"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </Button>
      </Stack>
    </Container>
  );
}
