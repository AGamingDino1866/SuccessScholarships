export async function onRequest(context) {
  const { request, next } = context;
  return next();
}
