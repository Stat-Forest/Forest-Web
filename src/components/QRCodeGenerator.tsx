// components/QRCodeGenerator.tsx
import React from "react";
import QRCode from "react-qr-code";

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ value, size = 100 }) => (
  <div className="p-2 bg-white inline-block rounded-md">
    <QRCode value={value} size={size} />
  </div>
);

export default QRCodeGenerator;
