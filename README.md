# PESOS Feed Aggregator

## 🚀 Quick Setup

**This project uses [Bun](https://bun.sh/) exclusively.** Do not use npm, yarn, or pnpm.

### First Time Setup

Run the automated setup script:

```bash
# This will install Bun (if needed) and set up the project
npm run setup
# OR if you already have Bun:
./scripts/setup.sh
```

### Manual Setup

If you prefer to set up manually:

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   source ~/.bashrc  # or restart your terminal
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Generate Prisma client**:
   ```bash
   bunx prisma generate
   ```

## 🔧 Development

Run the development server:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

Run tests:

```bash
bun run test
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📝 Project Details

This is a [Next.js](https://nextjs.org/) project for personal archiving and publishing.

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Stay Informed

New features are rolling out all the time. Visit `/subscribe` on the running site to leave your email and get updates.
