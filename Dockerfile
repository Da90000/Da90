# === STAGE 1: The Builder ===
# We use a full Node.js environment to install dependencies and build the app.
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies first to leverage Docker's caching
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Provide build-time arguments for Supabase keys
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Run the Next.js build command
RUN npm run build

# === STAGE 2: The Runner ===
# We use a clean, minimal Node.js image for the final product.
FROM node:18-alpine
WORKDIR /app

# Copy only the necessary built files from the 'builder' stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# The app will run on port 3000 inside the container
EXPOSE 3000

# The command to start the app
CMD ["npm", "start"]