# Setup Google Cloud SDK

## Quick Install (macOS)

### Option 1: Using Homebrew (Recommended)

```bash
brew install google-cloud-sdk
```

Then initialize:
```bash
gcloud init
```

### Option 2: Using Install Script

```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Option 3: Download from Google

1. Go to: https://cloud.google.com/sdk/docs/install
2. Download macOS installer
3. Run the installer
4. Open a new terminal and run `gcloud init`

---

## After Installation

### 1. Authenticate
```bash
gcloud auth login
```

### 2. Set Project
```bash
gcloud config set project edgedemo-ai
```

### 3. Verify
```bash
gcloud config get-value project
# Should output: edgedemo-ai
```

---

## Then Deploy

Once gcloud is installed and authenticated, you can run:
```bash
./deploy-now.sh
```

Or I can deploy it for you once gcloud is set up!

