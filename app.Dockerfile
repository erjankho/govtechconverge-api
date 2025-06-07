# ----------------------------------------
# Base Stage
# ----------------------------------------
FROM node:22.10.0-alpine3.20 AS base

RUN mkdir /converge
WORKDIR /converge

# Disable `husky`.
ENV HUSKY=0

# ----------------------------------------
# Build Stage
# ----------------------------------------
FROM base AS build

# Install `pnpm`.
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN mkdir $PNPM_HOME && \
                wget -qO- "https://github.com/pnpm/pnpm/releases/download/v9.12.3/pnpm-linuxstatic-x64" > "$PNPM_HOME/pnpm" && \
                chmod +x $PNPM_HOME/pnpm && \
                ln -s $PNPM_HOME/pnpm /usr/local/bin/pnpm

# Fetch all the dependencies into the virtual store.
COPY pnpm-lock.yaml ./
RUN pnpm fetch

COPY . .

# Install the dependencies.
RUN pnpm install --offline --ignore-scripts

RUN pnpm build

# Install production dependencies.
RUN find . -type d -name "node_modules" -prune -exec rm -rf {} + 
RUN pnpm install --offline --ignore-scripts --prod

# Remove all unnecessary files and folders.
RUN find . -mindepth 1 \
    ! -name "dist" ! -path "./dist/*" \
    ! -name "migrations" ! -path "./migrations/*" \
    ! -name "node_modules" ! -path "./node_modules/*" \
    ! -name "package.json" \
    -exec rm -rf {} +

# ----------------------------------------
# Production Stage
# ----------------------------------------
FROM base AS production
ENV NODE_ENV="production"

# Download SSL certificate bundle.
RUN wget https://truststore.pki.rds.amazonaws.com/ap-southeast-1/ap-southeast-1-bundle.pem -O /etc/ssl/certs/rds-ca-bundle.pem

# 1. Create a new user named `zero`.
# 2. Change the permission of `converge` folder to user `zero`.
# 3. Change the current user from `root` to `zero`.
RUN addgroup -S zero && \
                adduser -S zero -G zero && \
                chown zero:zero /converge
USER zero

COPY --from=build --chown=zero:zero /converge/ ./

EXPOSE 8001
CMD ["node", "./dist/main.js", "server"]
