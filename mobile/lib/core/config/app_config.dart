class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://YOUR-BACKEND-DOMAIN.com/api',
  );

  static String get socketUrl {
    final uri = Uri.parse(apiBaseUrl);
    return '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
  }
}
