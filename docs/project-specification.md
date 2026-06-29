# MomentumTxt - Business Momentum via SMS

**Building business momentum, one txt at a time.**

A commercial SaaS platform that delivers weekly SMS summaries of 7 key business KPIs to business owners and managers across all industries, with AI-powered industry-specific recommendations and flexible subscription billing.

## 🎯 Project Overview

**Market Opportunity:** 17.8 million US businesses need mobile-first business intelligence
**Competitive Advantage:** 90% cost savings vs existing solutions ($39/month vs $795/month)
**Revenue Model:** Subscription SaaS with 14-day free trials
**Target Market:** Small-medium businesses across all 19 NAICS industry codes

## 🏗️ Technical Architecture

### Core Stack

- **Backend:** Python Flask (use Replit Flask template)
- **Database:** PostgreSQL (Replit Database)
- **Authentication:** Flask-Login + WTForms
- **Frontend:** Tailwind CSS + Alpine.js (CDN)
- **Payments:** Stripe Checkout + Customer Portal
- **SMS:** Twilio SDK with multi-provider failover
- **AI:** OpenAI API for industry-specific KPI recommendations

### Key Integrations

- **Stripe:** Subscription billing, checkout, webhooks
- **Twilio:** SMS delivery with 99.9% reliability
- **OpenAI:** Generate 15-20 KPIs per NAICS industry
- **SendGrid:** Transactional emails and notifications

## 💰 Business Model

### Pricing Tiers

- **Starter:** $39/month - 1 SMS recipient, manual data entry only
- **Professional:** $79/month - 3 recipients, API integrations included
- **Business:** $149/month - 10 recipients, team collaboration
- **Enterprise:** $299/month - Unlimited recipients, white-label

### Revenue Projections

- **Year 1:** 4,000 customers = $1.87M ARR
- **Year 3:** 21,250 customers = $9.95M ARR
- **Market Size:** 17.8M US businesses = $4B+ potential market

## 🚀 MVP Features (Build These First)

### 1. User Registration & Industry Selection

- NAICS-based industry selection (19 major codes)
- Company setup and team management
- Role-based permissions (Owner, Admin, Manager, Data Entry, Viewer)

### 2. AI-Powered KPI Recommendation System

```python
# Generate 15-20 industry-specific KPIs using OpenAI API
industry_prompt = f"Generate relevant KPIs for NAICS {code} businesses"
user_selects_7_kpis = True
```

### 3. Flexible Data Collection

- **Manual Entry:** Web forms for team-based KPI input
- **API Integration:** QuickBooks, Stripe for automated data
- **Hybrid Approach:** Mix of manual and automated per KPI

### 4. Weekly SMS Automation

```
Sample SMS Format:
W18 Momentum Update
• Revenue $612k ▲3%
• Profit Margin 28% ▼2%
• New Customers 14 ▲5
• Pipeline $67k ▲18%
• Outstanding A/R $28k ▼15%
• Team Utilization 87% ▲3%
• Customer Satisfaction 4.8⭐ ▲0.1
```

### 5. Subscription Billing System

- Stripe Checkout with 14-day free trials
- Usage tracking and plan enforcement
- Customer portal for self-service billing
- Webhook handling for subscription events

### 6. Dashboard & Analytics

- Current KPI display with historical trends
- Week-over-week change calculations
- Team collaboration features
- SMS delivery history and status

## 📱 User Flow

### Onboarding (< 10 minutes)

1. **Sign up** → Select industry (NAICS) → AI generates KPI recommendations
2. **Choose 7 KPIs** → Configure data sources (manual vs API)
3. **Add SMS recipients** → Set delivery schedule → Start free trial
4. **First SMS** delivered within 48 hours

### Weekly Operation

1. **Data collection** (automated + manual team input)
2. **KPI calculations** with change detection
3. **SMS formatting** with proper symbols (▲▼)
4. **Delivery** every Friday at 8AM local time
5. **Dashboard updates** with historical trends

## 🔧 Development Guidelines

### Use Existing Solutions (80% of codebase)

```python
# DO NOT build from scratch - use these libraries:
from flask_login import LoginManager, login_required  # Authentication
from flask_wtf import FlaskForm                       # Form handling
import stripe                                         # Payment processing
from twilio.rest import Client                        # SMS delivery
import openai                                         # AI KPI generation
```

### Build Only Custom Business Logic (20% of codebase)

- NAICS industry mapping to KPI recommendations
- KPI calculation formulas and change detection
- SMS message formatting with proper symbols
- Subscription plan limits and usage enforcement
- Weekly automation scheduling

### Required Environment Variables

```bash
# Core Application
SECRET_KEY=your_flask_secret_key
DATABASE_URL=your_postgresql_url

# Payment Processing
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SMS Service
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# AI Integration
OPENAI_API_KEY=your_openai_key

# Email Service
SENDGRID_API_KEY=your_sendgrid_key
```

## 🎯 Success Metrics

### Technical Benchmarks

- **Signup to first SMS:** < 10 minutes
- **SMS delivery rate:** > 99.5%
- **Page load times:** < 3 seconds
- **Mobile responsiveness:** 100% compatibility

### Business Benchmarks

- **Trial-to-paid conversion:** > 15%
- **Monthly churn rate:** < 5%
- **Net Promoter Score:** > 50
- **Customer acquisition cost:** < $50

## 📊 NAICS Industry Coverage

Target all 19 major industry codes with AI-generated KPI libraries:

- **23 - Construction:** 1.5M entities
- **54 - Professional Services:** 2.5M entities
- **44-45 - Retail Trade:** 1.9M entities
- **72 - Food Services:** 932K entities
- **62 - Healthcare:** 1.7M entities
- [Additional 14 NAICS codes with full coverage]

## 🚀 Launch Strategy

### Phase 1: MVP Development (Weeks 1-2)

- Build core platform with manual data entry
- 5 NAICS industry templates
- Basic SMS delivery and billing

### Phase 2: Validation (Weeks 3-4)

- 20 beta customers across industries
- Subscription billing and trial system
- Automated SMS delivery

### Phase 3: Scale (Weeks 5-8)

- All 19 NAICS industries
- API integrations (QuickBooks, Stripe)
- Marketing campaigns and growth

## 💡 Competitive Positioning

### vs. CEOTXT ($795/month)

- **90% cost savings** ($39-149 vs $795)
- **Better features** (dashboard, team collaboration, API integrations)
- **Broader market** (all industries vs executive-only focus)

### vs. Generic Dashboards

- **Mobile-first delivery** (SMS vs web-only)
- **Industry-specific KPIs** (relevant vs generic)
- **Action-oriented** (momentum vs just tracking)

## 📞 Support & Documentation

### Customer Success

- **Onboarding assistance** for new customers
- **Industry-specific guides** for KPI selection
- **Best practices documentation** for each NAICS code

### Technical Support

- **API integration help** for Professional+ plans
- **SMS delivery troubleshooting**
- **Billing and subscription support**

---

## 🎯 Ready to Build

This README provides the complete specification for building MomentumTxt as a production-ready SaaS business targeting 17.8 million US businesses.

**Key Principles:**

1. **Use existing solutions** for 80% of the platform
2. **Build only unique business value** (NAICS + KPI + SMS automation)
3. **Launch fast and iterate** based on customer feedback
4. **Focus on revenue generation** from day one

**Let's build the momentum engine for American small businesses!** 🚀💪
