type PagePlaceholderProps = {
  subtitle?: string;
};

export default function PagePlaceholder({
  subtitle = "Page scaffold is ready.",
}: PagePlaceholderProps) {
  return (
    <section className="mobile-content" aria-label="Page content">
      <div className="mobile-content-inner">
        <p className="mobile-subtitle">{subtitle}</p>
      </div>
    </section>
  );
}
