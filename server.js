require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency, email } = req.body;
        
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency || 'usd',
            receipt_email: email,
            metadata: {
                product: req.body.product
            }
        });

        // Send publishable key and PaymentIntent client_secret to client
        res.status(200).json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (err) {
        console.error('Error creating payment intent:', err);
        res.status(500).json({ error: err.message });
    }
});

// Webhook for successful payments (optional)
app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
            // Here you can update your database, send emails, etc.
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    response.json({received: true});
});

// Start server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));