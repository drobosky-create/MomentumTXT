import Stripe from "stripe";
import type { User } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not provided. Billing functionality will be disabled.");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

// Pricing tiers
const PRICING_PLANS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "price_1TUCCOKuw60EwegJ1UEjRQVw",
    amount: 3900,
    name: "Starter",
    features: ["Up to 3 SMS recipients", "7 KPIs", "Basic integrations"],
  },
  professional: {
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "price_1TUCCOKuw60EwegJs8bvSkNm",
    amount: 7900,
    name: "Professional",
    features: [
      "Up to 10 SMS recipients",
      "Unlimited KPIs",
      "All integrations",
      "Team collaboration",
    ],
  },
  business: {
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || "price_1TUCCOKuw60EwegJtoaFldLq",
    amount: 14900,
    name: "Business",
    features: [
      "Unlimited SMS recipients",
      "Unlimited KPIs",
      "All integrations",
      "Team collaboration",
      "Priority support",
    ],
  },
};

interface SubscriptionResult {
  customerId: string;
  subscriptionId?: string;
  clientSecret?: string;
  status: string;
}

class StripeService {
  async createOrUpdateSubscription(
    user: User,
    planType: "starter" | "professional" | "business" = "starter"
  ): Promise<SubscriptionResult> {
    if (!stripe) {
      throw new Error("Stripe not configured. Please provide STRIPE_SECRET_KEY.");
    }

    if (!user.email) {
      throw new Error("User email is required for subscription creation.");
    }

    try {
      // Check if user already has a Stripe customer
      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          metadata: {
            userId: user.id,
            companyId: user.companyId || "",
          },
        });
        customerId = customer.id;
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

        if (subscription.status === "active") {
          return {
            customerId,
            subscriptionId: subscription.id,
            status: "active",
          };
        }
      }

      // Create new subscription
      const plan = PRICING_PLANS[planType];
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: plan.priceId,
          },
        ],
        trial_period_days: 14, // 14-day free trial
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      const invoice = subscription.latest_invoice as any; // Use any to bypass type restrictions
      let paymentIntent: Stripe.PaymentIntent | null = null;

      if (invoice && typeof invoice.payment_intent === "string") {
        // If payment_intent is just an ID, we'd need to retrieve it
        // For now, we'll handle it as null since we can't access it directly
        paymentIntent = null;
      } else if (invoice && typeof invoice.payment_intent === "object") {
        paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
      }

      return {
        customerId,
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret || undefined,
        status: subscription.status,
      };
    } catch (error: any) {
      console.error("Stripe subscription creation failed:", error);
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (!stripe) {
      throw new Error("Stripe not configured.");
    }

    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error: any) {
      console.error("Failed to cancel subscription:", error);
      throw new Error(`Subscription cancellation failed: ${error.message}`);
    }
  }

  async updateSubscription(
    subscriptionId: string,
    newPlanType: "starter" | "professional" | "business"
  ): Promise<Stripe.Subscription> {
    if (!stripe) {
      throw new Error("Stripe not configured.");
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const plan = PRICING_PLANS[newPlanType];

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: plan.priceId,
          },
        ],
        proration_behavior: "create_prorations",
      });

      return updatedSubscription;
    } catch (error: any) {
      console.error("Failed to update subscription:", error);
      throw new Error(`Subscription update failed: ${error.message}`);
    }
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<any> {
    if (!stripe) {
      throw new Error("Stripe not configured.");
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const sub = subscription as any; // Type assertion to access properties
      return {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEnd: sub.trial_end,
      };
    } catch (error: any) {
      console.error("Failed to get subscription status:", error);
      throw new Error(`Failed to get subscription status: ${error.message}`);
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: "usd" = "usd"
  ): Promise<{ clientSecret: string }> {
    if (!stripe) {
      throw new Error("Stripe not configured.");
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return { clientSecret: paymentIntent.client_secret! };
    } catch (error: any) {
      console.error("Failed to create payment intent:", error);
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!stripe) {
      throw new Error("Stripe not configured.");
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured.");
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      switch (event.type) {
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case "invoice.payment_succeeded":
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case "customer.subscription.trial_will_end":
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      console.error("Webhook signature verification failed:", error);
      throw new Error(`Webhook verification failed: ${error.message}`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const { storage } = await import("../storage");
    const customerId = subscription.customer as string;

    try {
      // Find user by Stripe customer ID
      const user = await this.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.error(`No user found for Stripe customer ${customerId}`);
        return;
      }

      // Update user subscription status
      const status =
        subscription.status === "active" || subscription.status === "trialing"
          ? "active"
          : subscription.status === "past_due"
            ? "past_due"
            : subscription.status === "canceled"
              ? "canceled"
              : "inactive";

      await storage.upsertUser({
        ...user,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        updatedAt: new Date(),
      });

      await storage.createActivity(
        user.companyId,
        null,
        "subscription_updated",
        `Subscription status changed to ${subscription.status}`
      );

      console.log(`Updated subscription for user ${user.id}: ${subscription.status}`);
    } catch (error) {
      console.error("Error handling subscription update:", error);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const { storage } = await import("../storage");
    const customerId = subscription.customer as string;

    try {
      const user = await this.getUserByStripeCustomerId(customerId);
      if (!user) return;

      await storage.upsertUser({
        ...user,
        subscriptionStatus: "canceled",
        updatedAt: new Date(),
      });

      await storage.createActivity(
        user.companyId,
        null,
        "subscription_canceled",
        "Subscription was canceled"
      );

      console.log(`Canceled subscription for user ${user.id}`);
    } catch (error) {
      console.error("Error handling subscription deletion:", error);
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const { storage } = await import("../storage");
    const customerId = invoice.customer as string;

    try {
      const user = await this.getUserByStripeCustomerId(customerId);
      if (!user) return;

      await storage.upsertUser({
        ...user,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      });

      await storage.createActivity(
        user.companyId,
        null,
        "payment_succeeded",
        `Payment of $${(invoice.amount_paid / 100).toFixed(2)} succeeded`
      );

      console.log(`Payment succeeded for user ${user.id}: $${invoice.amount_paid / 100}`);
    } catch (error) {
      console.error("Error handling payment success:", error);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const { storage } = await import("../storage");
    const customerId = invoice.customer as string;

    try {
      const user = await this.getUserByStripeCustomerId(customerId);
      if (!user) return;

      await storage.upsertUser({
        ...user,
        subscriptionStatus: "past_due",
        updatedAt: new Date(),
      });

      await storage.createActivity(
        user.companyId,
        null,
        "payment_failed",
        `Payment failed: ${invoice.amount_due / 100} due`
      );

      console.log(`Payment failed for user ${user.id}`);
    } catch (error) {
      console.error("Error handling payment failure:", error);
    }
  }

  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    const { storage } = await import("../storage");
    const customerId = subscription.customer as string;

    try {
      const user = await this.getUserByStripeCustomerId(customerId);
      if (!user) return;

      await storage.createActivity(
        user.companyId,
        null,
        "trial_ending_soon",
        "Your trial will end in 3 days"
      );

      console.log(`Trial ending soon for user ${user.id}`);
    } catch (error) {
      console.error("Error handling trial end warning:", error);
    }
  }

  private async getUserByStripeCustomerId(customerId: string): Promise<import("@shared/schema").User | undefined> {
    await import("../storage");
    const { db } = await import("../db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    if (!stripe) {
      throw new Error("Stripe not configured.");
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return session.url;
    } catch (error: any) {
      console.error("Failed to create portal session:", error);
      throw new Error(`Portal session creation failed: ${error.message}`);
    }
  }

  getPricingPlans() {
    return PRICING_PLANS;
  }

  async getUsageStats(_customerId: string): Promise<{ smsRecipients: number; kpisConfigured: number; smsDelivered: number }> {
    if (!stripe) {
      throw new Error("Stripe not configured.");
    }

    return {
      smsRecipients: 0,
      kpisConfigured: 0,
      smsDelivered: 0,
    };
  }
}

export const stripeService = new StripeService();
