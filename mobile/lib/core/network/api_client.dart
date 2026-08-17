import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';

class ApiClient {
  final TokenStorage storage;
  late final Dio dio;

  ApiClient({TokenStorage? storage}) : storage = storage ?? const TokenStorage() {
    dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
    ));
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await this.storage.read();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }
}
