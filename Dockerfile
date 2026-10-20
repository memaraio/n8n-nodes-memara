FROM node:22-alpine

# n8n-workflow peers pull native addons (e.g. isolated-vm); node-gyp needs a toolchain
RUN apk add --no-cache curl git python3 make g++

WORKDIR /app

COPY package*.json tsconfig.json gulpfile.js ./
RUN npm ci 2>/dev/null || npm install

COPY . .

RUN git config --global user.name "Memara" && \
	git config --global user.email "github@memara.io" && \
	git config --global init.defaultBranch main

# Optional: add `.env.github` / `.env.npm` (non-empty) to build context for CI publish flows only
RUN if [ -f .env.github ] && [ -s .env.github ]; then \
		export GITHUB_TOKEN="$(cat .env.github)" && \
		git init && \
		git remote add origin "https://${GITHUB_TOKEN}@github.com/memaraio/n8n-nodes-memara.git" && \
		git config --global credential.helper store && \
		echo "https://${GITHUB_TOKEN}@github.com" > ~/.git-credentials; \
	fi

RUN if [ -f .env.npm ] && [ -s .env.npm ]; then \
		export NPM_TOKEN="$(cat .env.npm)" && \
		npm config set //registry.npmjs.org/:_authToken="${NPM_TOKEN}"; \
	fi

RUN npm install -g n8n

EXPOSE 5678

CMD ["sh", "-c", "npm run build && n8n start"]
