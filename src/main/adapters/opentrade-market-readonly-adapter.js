export class OpenTradeMarketReadonlyAdapter {
  source = 'opentrade_market_readonly_later';
  enabled = false;
  readOnly = true;
  forbiddenActions = [
    'trading',
    'swaps',
    'wallet_transfer',
    'order_placement',
    'leverage',
    'signing',
    'transaction_execution'
  ];

  async fetch() {
    return [];
  }
}
