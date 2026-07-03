type PagePlaceholderProps = {
  subtitle?: string;
};

export default function PagePlaceholder({
  subtitle = "This page has been reset.",
}: PagePlaceholderProps) {
  return (
    <section aria-label="Page content" style={{ padding: "16px" }}>
      <p style={{ margin: 0, color: "#4b5563" }}>{subtitle}</p>
    </section>
  );
}
