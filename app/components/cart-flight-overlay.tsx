"use client";

import Box from "@mui/material/Box";
import {
  CART_FLIGHT_DURATION_MS,
  type CartFlight,
} from "@/app/hooks/use-cart-flight-animation";

type CartFlightOverlayProps = {
  flights: CartFlight[];
};

// Renders the flying product-name pill for each in-flight animation started
// by useCartFlightAnimation's launchCartFlight. Purely visual — position and
// lifetime are driven entirely by the flight objects passed in.
export default function CartFlightOverlay({ flights }: CartFlightOverlayProps) {
  return (
    <>
      {flights.map((flight) => (
        <Box
          key={flight.id}
          sx={{
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1202,
            pointerEvents: "none",
            transform: `translate(${flight.startX}px, ${flight.startY}px)`,
          }}
        >
          <Box
            sx={{
              px: 1.2,
              py: 0.7,
              borderRadius: 999,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.28)",
              typography: "caption",
              fontWeight: 700,
              maxWidth: 160,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transform: flight.active
                ? `translate(${flight.deltaX}px, ${flight.deltaY}px) scale(0.46)`
                : "translate(0px, 0px) scale(1)",
              opacity: flight.active ? 0.16 : 0.98,
              transition: `${CART_FLIGHT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              transformOrigin: "center",
            }}
          >
            {flight.label}
          </Box>
        </Box>
      ))}
    </>
  );
}
