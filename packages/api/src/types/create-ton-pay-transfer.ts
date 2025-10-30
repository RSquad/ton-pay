/**
 * @param amount - in human readable format, 10.5 for example
 * @param asset - jetton master address or TON coin address for TON transfer
 * @param recipientAddr - recipient wallet address. Optional if API key is provided - defaults to the merchant's wallet address from the admin panel
 * @param senderAddr - payer wallet address
 * @param queryId - only for Jetton
 * @param commentToSender - a comment that will be displayed in the user's wallet when signing a transaction
 * @param commentToRecipient - a comment that will be displayed in the recipient's wallet when receiving a transaction
 */

export type CreateTonPayTransferParams = {
  amount: number;
  asset: string;
  recipientAddr?: string;
  senderAddr: string;
  queryId?: number;
  commentToSender?: string;
  commentToRecipient?: string;
};

/**
 * @param message - a built message that will be sent to the recipient's wallet
 * @param bodyBase64Hash - a hash of the transaction message content in Base64 format
 * @param reference - a reference ID for the transaction, used for tracking the transaction
 */

export type CreateTonPayTransferResponse = {
  message: {
    address: string;
    amount: string;
    payload: string;
  };
  bodyBase64Hash: string;
  reference: string;
};
