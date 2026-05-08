FROM nginx:1.27-alpine

# Static assets
COPY public/ /usr/share/nginx/html/

# Hardening: remove default nginx config and write a minimal one
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health endpoint at /healthz served by nginx
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O - http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
