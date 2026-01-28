import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0.1,
  
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV,
  
  ignoreErrors: [
    "PrismaClientInitializationError",
    "DYNAMIC_SERVER_USAGE",
  ],
  
  // Security: mask PII and DB credentials before sending to Sentry
  beforeSend(event) {
    if (event.user?.email) {
      event.user.email = event.user.email.replace(/(.{2}).*(@.*)/, "$1***$2");
    }
    
    if (event.exception?.values) {
      event.exception.values.forEach((value) => {
        if (value.value) {
          value.value = value.value.replace(
            /postgresql:\/\/[^@]+@[^\s]+/g,
            "postgresql://***:***@***"
          );
        }
      });
    }
    
    return event;
  },
});
