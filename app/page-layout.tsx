import "./globals.css";

export const metadata = {
  title: "Coming Soon - PESOS.site",
  description: "Stay tuned for something amazing!",
};

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" style={{ textAlign: "center", marginTop: "20%" }}>
      {children}
    </div>
  );
}
