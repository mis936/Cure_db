import "./globals.css";
import { StoreProvider } from "../lib/store";

export const metadata = {
  title: "Sales Ledger — Data Entry",
  description: "Excel-style data entry for sales records, backed by Google Sheets",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
