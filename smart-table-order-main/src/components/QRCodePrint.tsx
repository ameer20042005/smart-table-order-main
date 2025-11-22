import { forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface QRCodePrintProps {
  tableNumber: string;
  tableId: string;
  qrCode: string;
}

export const QRCodePrint = forwardRef<HTMLDivElement, QRCodePrintProps>(
  ({ tableNumber, tableId, qrCode }, ref) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
      const generateQR = async () => {
        try {
          const url = `${window.location.origin}/customer-menu/${tableId}`;
          const qrUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
          });
          setQrDataUrl(qrUrl);
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      };
      generateQR();
    }, [tableId]);

    return (
      <div ref={ref} className="p-8 bg-white">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">مطعمنا الذكي</h1>
          <h2 className="text-2xl font-semibold">طاولة {tableNumber}</h2>
          {qrDataUrl && (
            <div className="flex justify-center">
              <img src={qrDataUrl} alt={`QR Code for Table ${tableNumber}`} />
            </div>
          )}
          <p className="text-lg">امسح الرمز للطلب</p>
          <p className="text-sm text-gray-500">Scan to order</p>
        </div>
      </div>
    );
  }
);

QRCodePrint.displayName = "QRCodePrint";
