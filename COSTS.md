# SlideCrux Monthly Cost Breakdown

## Fixed Costs
| Service | Monthly Cost | Notes |
|---|---|---|
| Supabase | $0 | Free tier (< 500MB DB, < 500K Edge Function invocations) |
| Vercel | $0 | Hobby plan |
| Umami Cloud | $0 | Free tier (< 10K events/mo) |
| Domain (Porkbun) | ~$0.92/mo | $11/yr for slidecrux.com |
| **Total Fixed** | **~$1/mo** | |

## Variable Costs (at 100 paying users)
| Service | Monthly Cost | Calculation |
|---|---|---|
| OpenRouter (LLM) | ~$18/mo | 100 users × avg 5 decks × $0.036/deck |
| OpenRouter (Whisper) | ~$7/mo | 30% upload rate × 3min avg × $0.006/min |
| Lemon Squeezy fees | ~$95/mo | 5% + $0.50 on ~$1,900 MRR |
| **Total Variable** | **~$120/mo** | |

## Break-Even Analysis
- At 5 paying users ($95 MRR): Costs ~$5 → Profitable
- At 50 paying users ($950 MRR): Costs ~$60 → 94% margin
- At 100 paying users ($1,900 MRR): Costs ~$121 → 94% margin
