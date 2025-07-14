// components/QRCodeGenerator.tsx
import React from "react";
import QRCode from "react-qr-code";

interface QRCodeGeneratorProps {
    sentBy: string;
    sentByOrg: string;
    sentByRole: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
    sentBy,
    sentByOrg,
    sentByRole,
}) => {
    
    const qrValue = JSON.stringify({
        sent_by: sentBy,
        sent_by_org: sentByOrg,
        sent_by_role: sentByRole,
    });

    return (
        <div className="p-2 bg-white inline-block">
            <QRCode value={qrValue} size={100} />
        </div>
    );
};

export default QRCodeGenerator;
