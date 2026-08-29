// Rodapé com o crédito de desenvolvimento.
export default function Footer() {
  return (
    <footer
      className="mt-auto px-4 py-5 lg:px-8 border-t"
      style={{
        borderColor: "var(--border)",
        background: "var(--card)",
        paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="w-full max-w-[1600px] mx-auto flex justify-center">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
          Desenvolvido por{" "}
          <a
            href="https://pacaas.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            style={{ color: "var(--foreground)" }}
          >
            <img src="/pacaas-lab-mark.png" alt="" width={93} height={96} className="h-4 w-auto" />
            Pacaás Lab
          </a>
        </span>
      </div>
    </footer>
  );
}
