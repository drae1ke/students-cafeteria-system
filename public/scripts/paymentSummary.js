import { cartItems } from "./cart.js";
 function getProduct(id){
    for (const item of menuItems){
        if(item.id === id){
            return item;
        }
    }
    return null;
 }
export function updatePaymentSummary() {
    const itemCount = cartItems.length;
    let subsidyRate = 0.10;

    // Fixed reduce function and product price lookup
    const totalCents = cartItems.reduce((sum, cartItem) => {
        const product = getProduct(cartItem.id);
        return sum + (product.priceCents * cartItem.quantity); // Added return
    }, 0);

    const totalBeforeSubsidy = totalCents / 100;
    const subsidy = totalBeforeSubsidy * subsidyRate;
    const orderTotal = totalBeforeSubsidy - subsidy;

    const paymentSummaryHTML = `
        <div class="payment-summary-row">
            <div>Items (${itemCount}):</div>
            <!-- Fixed items total display -->
            <div class="payment-summary-money js-items-total">kes${totalBeforeSubsidy.toFixed(2)}</div>
        </div>

        <div class="payment-summary-row subtotal-row">
            <div>Total before Subsidy:</div>
            <div class="payment-summary-money js-total-before-subsidy">kes${totalBeforeSubsidy.toFixed(2)}</div>
        </div>

        <div class="payment-summary-row">
            <div>Estimated Subsidy (10%):</div>
            <div class="payment-summary-money js-subsidy">-kes${subsidy.toFixed(2)}</div>
        </div>

        <div class="payment-summary-row total-row">
            <div>Order total:</div>
            <div class="payment-summary-money js-order-total">kes${orderTotal.toFixed(2)}</div>
        </div>
         <button class="place-order-button button-primary">
                Place your order
            </button>`;

    document.querySelector('.payment-summary').innerHTML = paymentSummaryHTML;
}