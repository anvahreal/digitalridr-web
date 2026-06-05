const m = /[!#$%&()*:;<=>?\]\^[{|\}~]/gi;
const y = /^(?:\d*\.\d{1,2}|\d+)$/;

function checkInput(n) {
    if (!n.key || typeof n.key !== "string") throw new Error("You have to pass in a valid public key");
    if (!n.customer || !n.customer.name || typeof n.customer.name !== "string" || m.test(n.customer.name)) 
        throw new Error("The customer name field must contain valid input (type: string) " + n.customer.name);
    
    if (!n.amount || isNaN(n.amount) || typeof n.amount === "string" || !y.test(n.amount)) 
        throw new Error("The amount field must contain valid input (type: number)");
        
    if (!n.customer || !n.customer.email || typeof n.customer.email !== "string" || m.test(n.customer.email)) 
        throw new Error("The customer email field must contain valid input (type: string)");
        
    if ("metadata" in n && (!n["metadata"] || Array.isArray(n["metadata"]) || typeof n["metadata"] !== "object")) 
        throw new Error("The metadata field must be an object");
        
    console.log("Input is valid!");
}

try {
    checkInput({
        key: "pk_test_xvXFN3HCQPpUFGNKj3fKHxTY6sqGnZrzw4AhxzHQ",
        reference: "DR-12345-ABCDEF",
        amount: 50000,
        currency: "NGN",
        customer: {
            name: "customer@example.com",
            email: "customer@example.com"
        },
        metadata: {
            booking: "digitalridr",
            listing_id: "123",
            guest_id: "123",
            host_id: "123",
            check_in: new Date().toISOString(),
            check_out: new Date().toISOString(),
            guests: 1,
            total_price: 50000,
            platform_fee: 5000,
            host_payout_amount: 45000,
            security_deposit: 0,
        }
    });
} catch(e) {
    console.error(e.message);
}
