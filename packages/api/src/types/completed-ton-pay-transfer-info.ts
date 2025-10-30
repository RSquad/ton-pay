/**
 * @param amount - the amount of the transfer in human readable format
 * @param rawAmount - the amount of the transfer in base units
 * @param senderAddr - the address of the sender wallet
 * @param recipientAddr - the address of the recipient wallet
 * @param asset - the address of the asset
 * @param assetTicker - the ticker of the asset (e.g. "USDT")
 * @param status - the status of the transfer ("success" or "failed")
 * @param reference - the reference of the transfer
 * @param bodyBase64Hash - the hash of the body of the transfer in Base64 format
 * @param txHash - the hash of the transaction
 * @param traceId - the id of the trace
 * @param commentToSender - the comment to the sender wallet
 * @param commentToRecipient - the comment to the recipient wallet
 * @param date - the date of the transfer
 * @param errorCode - the error code of the transfer
 * @param errorMessage - the error message of the transfer
 */

export type CompletedTonPayTransferInfo = {
  amount: string;
  rawAmount: string;
  senderAddr: string;
  recipientAddr: string;
  asset: string;
  assetTicker?: string;
  status: string;
  reference: string;
  bodyBase64Hash: string;
  txHash: string;
  traceId: string;
  commentToSender?: string;
  commentToRecipient?: string;
  date: string;
  errorCode?: number;
  errorMessage?: string;
};
