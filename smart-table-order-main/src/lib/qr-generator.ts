import QRCode from 'qrcode';

export const generateQRCode = async (text: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

export const generateTableQRCode = async (tableId: string, tableNumber: string): Promise<string> => {
  const url = `${window.location.origin}/customer-menu/${tableId}`;
  return generateQRCode(url);
};

export const generateItemQRCode = async (itemId: string): Promise<string> => {
  const url = `${window.location.origin}/item/${itemId}`;
  return generateQRCode(url);
};
