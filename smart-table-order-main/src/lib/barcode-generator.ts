import JsBarcode from 'jsbarcode';

export const generateBarcode = (elementId: string, value: string): void => {
  try {
    const element = document.getElementById(elementId);
    if (element) {
      JsBarcode(element, value, {
        format: 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
      });
    }
  } catch (error) {
    console.error('Error generating barcode:', error);
  }
};

export const generateBarcodeDataURL = (value: string): string => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating barcode data URL:', error);
    return '';
  }
};

export const generateItemBarcode = (itemId: string): string => {
  return `ITEM-${itemId.slice(0, 8).toUpperCase()}`;
};

export const generateOrderBarcode = (orderId: string): string => {
  return `ORD-${orderId.slice(0, 8).toUpperCase()}`;
};
