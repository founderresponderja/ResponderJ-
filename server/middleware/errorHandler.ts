import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Logger, ErrorType, StructuredError } from '../utils/Logger.js';
import { Buffer } from 'buffer';

// Estender interface Request para incluir propriedades customizadas
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      validatedData?: any;
    }
  }
}

/**
 * Classe de erro estruturado para classificação e tratamento consistente
 * 
 * Estende a classe Error nativa com informações adicionais para facilitar
 * o debugging, categorização e resposta adequada ao cliente.
 * 
 * Características principais:
 * - Classificação por tipo (validation, auth, database, etc.)
 * - Códigos de erro consistentes
 * - Status HTTP apropriados
 * - Contexto adicional para debugging
 * - Indicação se é erro operacional ou de sistema
 * 
 * @example
 * throw AppError.validation('Email inválido', 'email', 'invalid@');
 * throw AppError.authentication('Sessão expirada');
 * throw AppError.database('Conexão perdida', originalError);
 */
export class AppError extends Error implements StructuredError {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: ErrorType = ErrorType.SYSTEM,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.originalError = originalError;

    // Capturar stack trace
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Cria erro de validação para dados de entrada inválidos
   * 
   * Utilizado quando dados fornecidos pelo utilizador não cumprem
   * os critérios de validação (formato, tipo, obrigatoriedade, etc.)
   * 
   * @param message - Descrição do erro de validação
   * @param field - Nome do campo que falhou a validação (opcional)
   * @param value - Valor que causou o erro (opcional, sanitizado nos logs)
   * @returns AppError com status 400 e tipo VALIDATION
   * 
   * @example
   * throw AppError.validation('Email deve ter formato válido', 'email', userInput);
   * throw AppError.validation('Campo obrigatório', 'name');
   */
  static validation(message: string, field?: string, value?: any): AppError {
    return new AppError(
      message,
      ErrorType.VALIDATION,
      400,
      true,
      'VALIDATION_ERROR',
      { field, value }
    );
  }

  /**
   * Cria erro de autenticação para utilizadores não autenticados
   * 
   * Utilizado quando uma operação requer autenticação mas o utilizador
   * não está autenticado ou a sessão expirou.
   * 
   * @param message - Mensagem personalizada (opcional)
   * @returns AppError com status 401 e tipo AUTHENTICATION
   * 
   * @example
   * throw AppError.authentication(); // Mensagem padrão
   * throw AppError.authentication('Sessão expirada, faça login novamente');
   */
  static authentication(message: string = 'Autenticação necessária'): AppError {
    return new AppError(
      message,
      ErrorType.AUTHENTICATION,
      401,
      true,
      'AUTH_REQUIRED'
    );
  }

  /**
   * Cria erro de autorização para utilizadores sem permissões adequadas
   * 
   * Utilizado quando um utilizador autenticado tenta aceder a recursos
   * ou executar operações para as quais não tem autorização.
   * 
   * @param message - Mensagem personalizada (opcional)
   * @returns AppError com status 403 e tipo AUTHORIZATION
   * 
   * @example
   * throw AppError.authorization(); // Mensagem padrão
   * throw AppError.authorization('Apenas administradores podem aceder');
   */
  static authorization(message: string = 'Acesso negado'): AppError {
    return new AppError(
      message,
      ErrorType.AUTHORIZATION,
      403,
      true,
      'ACCESS_DENIED'
    );
  }

  /**
   * Cria erro para recursos que não existem ou não foram encontrados
   * 
   * Utilizado quando um ID, rota ou recurso solicitado não existe
   * na base de dados ou sistema.
   * 
   * @param resource - Nome do recurso não encontrado
   * @returns AppError com status 404 e tipo NOT_FOUND
   * 
   * @example
   * throw AppError.notFound('Utilizador');
   * throw AppError.notFound('Produto com ID 123');
   */
  static notFound(resource: string = 'Recurso'): AppError {
    return new AppError(
      `${resource} não encontrado`,
      ErrorType.NOT_FOUND,
      404,
      true,
      'NOT_FOUND',
      { resource }
    );
  }

  /**
   * Cria erro para problemas de base de dados
   * 
   * Utilizado para encapsular erros de conexão, queries, constraints
   * e outros problemas relacionados com a base de dados.
   * 
   * @param message - Descrição interna do erro (não exposta ao cliente)
   * @param originalError - Erro original da base de dados (para debugging)
   * @returns AppError com status 500 e tipo DATABASE
   * 
   * @example
   * throw AppError.database('Connection timeout', connectionError);
   * throw AppError.database('Unique constraint violation', dbError);
   */
  static database(message: string, originalError?: Error): AppError {
    return new AppError(
      'Erro na base de dados',
      ErrorType.DATABASE,
      500,
      true,
      'DB_ERROR',
      { originalMessage: message },
      originalError
    );
  }

  /**
   * Criar erro de API externa
   */
  static externalApi(service: string, message: string, statusCode?: number): AppError {
    return new AppError(
      `Erro na integração com ${service}`,
      ErrorType.EXTERNAL_API,
      statusCode || 502,
      true,
      'EXTERNAL_API_ERROR',
      { service, originalMessage: message }
    );
  }

  /**
   * Criar erro de rate limiting
   */
  static rateLimit(message: string = 'Muitas tentativas'): AppError {
    return new AppError(
      message,
      ErrorType.RATE_LIMIT,
      429,
      true,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  /**
   * Criar erro de segurança
   */
  static security(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ErrorType.SECURITY,
      403,
      true,
      'SECURITY_VIOLATION',
      context
    );
  }

  /**
   * Converte erros de validação do Zod em AppError estruturado
   * 
   * Extrai o primeiro erro de validação do Zod e cria um AppError
   * com informações detalhadas sobre o campo e valor que falharam.
   * 
   * @param error - ZodError com detalhes de validação
   * @returns AppError.validation com campo e valor problemáticos
   * 
   * @example
   * try {
   *   userSchema.parse(userData);
   * } catch (error) {
   *   if (error instanceof z.ZodError) {
   *     throw AppError.fromZodError(error);
   *   }
   * }
   */
  static fromZodError(error: z.ZodError): AppError {
    const firstIssue = error.issues[0];
    const field = firstIssue.path.join('.');
    const message = `${field}: ${firstIssue.message}`;
    
    return AppError.validation(message, field, (firstIssue as any).received);
  }
}

/**
 * Middleware para injetar ID único em cada request HTTP
 * 
 * Adiciona um requestId único a cada request que pode ser utilizado
 * para tracking através de todos os logs e sistemas. O ID é também
 * retornado no header X-Request-Id para debugging pelo cliente.
 * 
 * @param req - Request object do Express
 * @param res - Response object do Express
 * @param next - Função para continuar para próximo middleware
 * 
 * @example
 * app.use(requestIdMiddleware);
 * // req.requestId estará disponível em todos os middlewares seguintes
 */
export function requestIdMiddleware(req: any, res: any, next: any): void {
  req.requestId = Logger.generateRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

/**
 * Middleware para logging detalhado de requests e responses
 * 
 * Regista o início de cada request e automaticamente faz log do resultado
 * quando a response é enviada, incluindo tempo de processamento,
 * status code e tamanho da resposta.
 * 
 * @param req - Request object do Express
 * @param res - Response object do Express
 * @param next - Função para continuar para próximo middleware
 * 
 * @example
 * app.use(requestLoggerMiddleware);
 * // Logs automáticos: "Incoming request" e "Request completed"
 */
export function requestLoggerMiddleware(req: any, res: any, next: any): void {
  const timer = Logger.timer(`${req.method} ${req.originalUrl}`);
  const context = Logger.createRequestContext(req);
  
  Logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, context);

  // Log da resposta quando terminar
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = timer();
    const responseContext = {
      ...context,
      statusCode: res.statusCode,
      duration,
      responseSize: body ? Buffer.byteLength(body, 'utf8') : 0
    };

    if (res.statusCode >= 400) {
      Logger.warn(`Request completed with error`, responseContext);
    } else {
      Logger.info(`Request completed successfully`, responseContext);
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Middleware global para tratamento centralizado de todos os erros
 * 
 * Captura todos os erros não tratados na aplicação, converte-os em AppError
 * estruturados quando necessário, faz logging apropriado e retorna
 * resposta JSON consistente ao cliente.
 * 
 * Funcionalidades:
 * - Conversão automática de erros conhecidos (Zod, DB, etc.) em AppError
 * - Logging estruturado com contexto completo
 * - Sanitização de detalhes sensíveis em produção
 * - Alertas especiais para violações de segurança
 * 
 * @param error - Erro capturado (qualquer tipo)
 * @param req - Request object do Express
 * @param res - Response object do Express
 * @param next - Função next (não utilizada, mas requerida pela interface)
 * 
 * @example
 * app.use(globalErrorHandler); // Deve ser o último middleware
 */
export function globalErrorHandler(
  error: Error | AppError,
  req: any,
  res: any,
  next: any
): void {
  const context = Logger.createRequestContext(req);
  
  // Converter erros conhecidos para AppError
  let appError: AppError;
  
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof z.ZodError) {
    appError = AppError.fromZodError(error);
  } else if (error.name === 'ValidationError') {
    appError = AppError.validation(error.message);
  } else if (error.name === 'CastError') {
    appError = AppError.validation('ID inválido fornecido');
  } else if (error.name === 'MongoError' || error.name === 'PostgresError') {
    appError = AppError.database(error.message, error);
  } else {
    // Erro não previsto - tratar como erro do sistema
    appError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'Erro interno do servidor' 
        : error.message,
      ErrorType.SYSTEM,
      500,
      false, // Não operacional - erro inesperado
      'INTERNAL_ERROR',
      undefined,
      error
    );
  }

  // Log do erro com contexto completo
  const errorContext = {
    ...context,
    statusCode: appError.statusCode,
    errorType: appError.type,
    errorCode: appError.code,
    isOperational: appError.isOperational,
    metadata: {
      ...appError.context,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    }
  };

  Logger.error(appError.message, appError, errorContext);

  // Resposta de erro sanitizada para o cliente
  const errorResponse: any = {
    success: false,
    error: {
      message: appError.message,
      type: appError.type,
      code: appError.code,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    }
  };

  // Em desenvolvimento, incluir mais detalhes
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = appError.stack;
    errorResponse.error.context = appError.context;
  }

  // Definir status code
  res.status(appError.statusCode);

  // Para erros de segurança, log adicional
  if (appError.type === ErrorType.SECURITY) {
    Logger.security(`Security violation: ${appError.message}`, errorContext);
  }

  // Resposta JSON
  res.json(errorResponse);
}

/**
 * Wrapper para capturar erros em funções assíncronas de middleware/rotas
 * 
 * O Express não captura automaticamente erros em funções async.
 * Este wrapper garante que erros rejeitados em Promises são passados
 * para o middleware de tratamento de erros.
 * 
 * @param fn - Função assíncrona de middleware ou rota
 * @returns Função wrapper que captura erros automaticamente
 * 
 * @example
 * app.get('/users', asyncHandler(async (req, res) => {
 *   const users = await db.getUsers(); // Se falhar, erro é capturado
 *   res.json(users);
 * }));
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware para tratar rotas não encontradas (404)
 * 
 * Deve ser registado após todas as rotas válidas para capturar
 * requests que não correspondem a nenhuma rota definida.
 * 
 * @param req - Request object do Express
 * @param res - Response object do Express
 * @param next - Função para passar erro para handler global
 * 
 * @example
 * // Registar após todas as rotas
 * app.use('/api', apiRoutes);
 * app.use(notFoundHandler);
 * app.use(globalErrorHandler);
 */
export function notFoundHandler(req: any, res: any, next: any): void {
  const error = AppError.notFound(`Rota ${req.originalUrl}`);
  next(error);
}

/**
 * Middleware para validação de dados de entrada com schemas Zod
 * 
 * Valida req.body contra um schema Zod e coloca dados validados
 * em req.validatedData. Se a validação falhar, automaticamente
 * lana AppError.validation com detalhes do erro.
 * 
 * @param schema - Schema Zod para validação
 * @returns Middleware que valida req.body
 * 
 * @example
 * const userSchema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(2)
 * });
 * 
 * app.post('/users', validateSchema(userSchema), (req, res) => {
 *   const userData = req.validatedData; // Dados já validados
 *   // ...
 * });
 */
export function validateSchema<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.parse(req.body);
      req.validatedData = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(AppError.fromZodError(error));
      } else {
        next(error);
      }
    }
  };
}