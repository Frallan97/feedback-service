# Feedback Service Deployment Guide

## Step-by-Step Deployment to Kubernetes via ArgoCD

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `feedback-service`
3. Description: `Centralized feedback collection microservice`
4. Visibility: **Public** (required for GitHub Actions to push to GHCR)
5. Do NOT initialize with README (we already have one)
6. Click "Create repository"

### Step 2: Push Code to GitHub

```bash
cd /home/frans-sjostrom/Documents/hezner-hosted-projects/feedback-service

# Add remote
git remote add origin https://github.com/Frallan97/feedback-service.git

# Push to main
git push -u origin main
```

### Step 3: Verify GitHub Actions Build

After pushing, GitHub Actions will automatically build and push Docker images:

1. Go to https://github.com/Frallan97/feedback-service/actions
2. Wait for the workflow to complete (about 3-5 minutes)
3. Verify images were pushed:
   - https://github.com/Frallan97/feedback-service/pkgs/container/feedback-service-backend
   - https://github.com/Frallan97/feedback-service/pkgs/container/feedback-service-frontend

### Step 4: Update k3s-infra App-of-Apps

Edit the ApplicationSet in your k3s-infra repository:

```bash
cd /home/frans-sjostrom/Documents/hezner-hosted-projects/k3s-infra
```

Edit `clusters/main/apps/app-of-apps.yaml` and add the feedback-service application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: app-of-apps
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      # ... existing apps ...

      # Add this new entry:
      - name: feedback-service
        repoURL: https://github.com/Frallan97/feedback-service.git
        targetRevision: main
        path: charts/feedback-service
        namespace: feedback-service

  template:
    metadata:
      name: '{{name}}'
      namespace: argocd
    spec:
      project: default
      source:
        repoURL: '{{repoURL}}'
        targetRevision: '{{targetRevision}}'
        path: '{{path}}'
        helm:
          releaseName: '{{name}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

Commit and push:

```bash
git add clusters/main/apps/app-of-apps.yaml
git commit -m "feat: add feedback-service to app-of-apps"
git push origin main
```

### Step 5: Create Namespace and Image Pull Secret

SSH to your Kubernetes master node:

```bash
ssh root@37.27.40.86
```

Create the namespace:

```bash
kubectl create namespace feedback-service
```

Create the image pull secret (replace `<GITHUB_PAT>` with your GitHub Personal Access Token):

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=frallan97 \
  --docker-password=<GITHUB_PAT> \
  --namespace=feedback-service
```

**How to create a GitHub PAT if you don't have one:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "k3s-cluster-ghcr-pull"
4. Select scopes: `read:packages`
5. Click "Generate token"
6. Copy the token immediately (you won't see it again!)

### Step 6: Wait for ArgoCD to Sync

ArgoCD should automatically detect the new application and sync it. You can monitor the progress:

```bash
# Watch ArgoCD sync
kubectl get applications -n argocd

# Check feedback-service pods
kubectl get pods -n feedback-service

# View logs if needed
kubectl logs -n feedback-service -l app=feedback-service-backend
kubectl logs -n feedback-service -l app=feedback-service-frontend
```

Or via ArgoCD UI:
1. Navigate to https://argocd.vibeoholic.com
2. Look for "feedback-service" application
3. Click on it to see deployment status
4. Once all resources are green, the deployment is complete!

### Step 7: Verify Deployment

1. **Check DNS** (if not already configured):
   - Add A records in Cloudflare:
     - `feedback-api.vibeoholic.com` → `37.27.40.86`
     - `feedback.vibeoholic.com` → `37.27.40.86`

2. **Test the API**:
   ```bash
   curl https://feedback-api.vibeoholic.com/api/v1/health
   # Should return: OK
   ```

3. **Access Admin Dashboard**:
   - Navigate to https://feedback.vibeoholic.com
   - Login with Google OAuth
   - Create your first application!

### Step 8: Create Your First Application

1. Login to https://feedback.vibeoholic.com
2. Click "Applications" in the top nav
3. Click "+ Create Application"
4. Fill in:
   - Name: "Ticket System"
   - Slug: "ticket-system"
   - Description: "Event ticketing platform"
5. Copy the generated API key
6. Test feedback submission:

```bash
curl -X POST https://feedback-api.vibeoholic.com/api/v1/public/feedback \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is my first feedback!",
    "title": "Test Feedback",
    "rating": 5,
    "contact_email": "test@example.com"
  }'
```

7. Verify the feedback appears in the dashboard!

## Troubleshooting

### ArgoCD Application Not Syncing

```bash
# Force sync
kubectl -n argocd get application feedback-service
argocd app sync feedback-service

# Or via UI: click "Sync" button
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n feedback-service

# Describe pod to see events
kubectl describe pod -n feedback-service <pod-name>

# Common issues:
# 1. ImagePullBackOff - check image pull secret exists
# 2. CrashLoopBackOff - check logs for errors
```

### Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl get pods -n feedback-service -l app=feedback-service-postgresql

# Check database logs
kubectl logs -n feedback-service -l app=feedback-service-postgresql

# Connect to database (from backend pod)
kubectl exec -it -n feedback-service <backend-pod-name> -- sh
# Inside pod:
# apk add postgresql-client
# psql postgresql://feedbackuser:feedbackpass@feedback-service-postgresql:5432/feedbackdb
```

### Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n feedback-service

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Manually trigger certificate issuance
kubectl delete certificate feedback-tls -n feedback-service
# ArgoCD will recreate it
```

### Auth Service Integration Issues

The feedback-service depends on auth-service for JWT validation. Ensure:

1. Auth-service is running: `kubectl get pods -n auth-service`
2. Auth-service is accessible: `curl http://auth-service.auth-service.svc.cluster.local:8081/api/health`
3. JWT public key is accessible: `curl http://auth-service.auth-service.svc.cluster.local:8081/api/public-key`

If auth-service is not deployed, you need to deploy it first before feedback-service will work.

## Rollback

If something goes wrong, rollback to the previous version:

```bash
# Via ArgoCD UI: Click "History" → Select previous revision → "Rollback"

# Or via CLI:
argocd app rollback feedback-service <revision-number>
```

## Updating the Application

To deploy updates:

1. Make code changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push origin main
   ```
3. GitHub Actions will build new images
4. ArgoCD will automatically sync the changes (if auto-sync is enabled)
5. Or manually sync via UI or CLI: `argocd app sync feedback-service`

## Monitoring

### View Logs

```bash
# Backend logs
kubectl logs -f -n feedback-service -l app=feedback-service-backend

# Frontend logs
kubectl logs -f -n feedback-service -l app=feedback-service-frontend

# Database logs
kubectl logs -f -n feedback-service -l app=feedback-service-postgresql
```

### Check Resource Usage

```bash
# Pod resource usage
kubectl top pods -n feedback-service

# Node resource usage
kubectl top nodes
```

### Scale Replicas

If you need to scale:

```bash
# Edit values.yaml in the repo and change replicaCount, then push
# Or manually:
kubectl scale deployment feedback-service-backend -n feedback-service --replicas=3
kubectl scale deployment feedback-service-frontend -n feedback-service --replicas=3
```

## Production Checklist

- [ ] GitHub repository created and pushed
- [ ] GitHub Actions workflow completed successfully
- [ ] k3s-infra updated with feedback-service
- [ ] Namespace created
- [ ] Image pull secret created
- [ ] ArgoCD application synced
- [ ] DNS records configured (A records)
- [ ] TLS certificates issued
- [ ] Health check passes (https://feedback-api.vibeoholic.com/api/v1/health)
- [ ] Admin dashboard accessible (https://feedback.vibeoholic.com)
- [ ] Test application created
- [ ] Test feedback submitted successfully
- [ ] Auth-service integration verified

## Support

If you encounter issues:
1. Check ArgoCD UI for application status
2. Review pod logs: `kubectl logs -n feedback-service <pod-name>`
3. Check events: `kubectl get events -n feedback-service --sort-by='.lastTimestamp'`
4. Review this troubleshooting guide

For persistent issues, check:
- GitHub Issues: https://github.com/Frallan97/feedback-service/issues
- ArgoCD Logs: `kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server`
