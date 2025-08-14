require("dotenv").config();
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

/**
 * When a new document is created in the 'orders' collection,
 * this function creates a Stripe PaymentIntent and updates the document.
 */
exports.createStripePaymentIntent = onDocumentCreated({ document: "orders/{orderId}", region: "europe-west1" }, async (event) => {
    const snap = event.data;
    if (!snap) {
        console.log("No data associated with the event");
        return;
    }
    const orderData = snap.data();
    const amount = orderData.amount;
    const currency = orderData.currency;

    // Stripe requires amount to be an integer and has minimums (e.g., 200 for PLN)
    if (!Number.isInteger(amount) || (currency === 'pln' && amount < 200)) {
        const errorMessage = `Amount must be at least 2.00 zł pln. Provided: ${(amount / 100).toFixed(2)} zł.`;
        console.error(`Invalid amount for order ${event.params.orderId}: ${errorMessage}`);
        await snap.ref.update({ status: "error", errorMessage: errorMessage });
        return { success: false, error: errorMessage };
    }

    try {
        // 1. Create a PaymentIntent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            automatic_payment_methods: { enabled: true },
        });

        // 2. Update the Firestore document with the clientSecret and paymentIntentId
        await snap.ref.update({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id, // Store the ID for webhook matching
        });
        
        console.log(`Successfully created PaymentIntent for order ${event.params.orderId}`);
        return { success: true };

    } catch (error) {
        console.error(`Error creating PaymentIntent for order ${event.params.orderId}:`, error);
        await snap.ref.update({ status: "error", errorMessage: error.message });
        return { success: false, error: error.message };
    }
});

/**
 * Handles events from Stripe via a webhook to update order status
 * and send email notifications.
 */
exports.stripeWebhook = onRequest({ region: "europe-west1" }, async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify the event came from Stripe
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error("Webhook signature verification failed.", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Simple HTML sanitizer
    const sanitize = (str) => {
        if (!str) return "";
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    // Handle the event
    switch (event.type) {
        case "payment_intent.succeeded":
            const paymentIntent = event.data.object;
            console.log("PaymentIntent was successful!", paymentIntent.id);

            // Find the order in Firestore using the paymentIntentId
            const ordersRef = admin.firestore().collection("orders");
            const query = ordersRef.where("paymentIntentId", "==", paymentIntent.id);
            const querySnapshot = await query.get();

            if (querySnapshot.empty) {
                console.error("No order found for paymentIntentId:", paymentIntent.id);
                return res.status(404).send("Order not found.");
            }

            const orderDoc = querySnapshot.docs[0];
            await orderDoc.ref.update({ status: "paid" });

            // Send an email notification to the expert
            const orderData = orderDoc.data();
            const mailOptions = {
                from: `"PismoPRO" <${process.env.EMAIL_USER}>`,
                to: process.env.EXPERT_EMAIL,
                subject: `Nowe opłacone zamówienie: ${orderDoc.id}`,
                html: `
                    <h1>Nowe opłacone zamówienie!</h1>
                    <p><strong>ID Zamówienia:</strong> ${orderDoc.id}</p>
                    <p><strong>Pakiet:</strong> ${sanitize(orderData.plan)}</p>
                    <p><strong>Klient:</strong> ${sanitize(orderData.fullName)} (${sanitize(orderData.customerEmail)})</p>
                    <p><strong>Typ sprawy:</strong> ${sanitize(orderData.caseType)}</p>
                    <p><strong>Opis:</strong></p>
                    <pre>${sanitize(orderData.description)}</pre>
                `,
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log("Success email sent to expert.");
            } catch (emailError) {
                console.error("Failed to send success email:", emailError);
            }
            break;

        case "payment_intent.payment_failed":
            const failedPaymentIntent = event.data.object;
            console.log("Payment failed for:", failedPaymentIntent.id);

            // Find the order and update its status to "payment_failed"
            const failedOrdersRef = admin.firestore().collection("orders");
            const failedQuery = failedOrdersRef.where("paymentIntentId", "==", failedPaymentIntent.id);
            const failedQuerySnapshot = await failedQuery.get();

            if (!failedQuerySnapshot.empty) {
                const failedOrderDoc = failedQuerySnapshot.docs[0];
                await failedOrderDoc.ref.update({ status: "payment_failed" });
                console.log(`Updated order ${failedOrderDoc.id} to payment_failed.`);
            }
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).send();
});