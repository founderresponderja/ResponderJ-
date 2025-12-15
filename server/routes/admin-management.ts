
import { Express } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";

// Schema para validação de entrada
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  nif: z.string().min(9).max(9),
  isAdmin: z.boolean().default(false),
  subscriptionPlan: z.enum(["trial", "starter", "pro", "agency"]).default("trial"),
  confirmPassword: z.string(),
});

const editUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  isAdmin: z.boolean(),
  subscriptionPlan: z.enum(["trial", "starter", "pro", "agency"]),
  isActive: z.boolean(),
  confirmPassword: z.string(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
});

const deleteUserSchema = z.object({
  confirmPassword: z.string(),
});

// Middleware para verificar se é super admin
const requireSuperAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const user = await storage.getUserById(req.user.id);
  if (!user || !user.isSuperAdmin) {
    return res.status(403).json({ 
      message: "Acesso negado. Apenas super administradores podem aceder a esta funcionalidade." 
    });
  }

  next();
};

// Função para verificar password do super admin
const verifySuperAdminPassword = async (userId: string, password: string): Promise<boolean> => {
  try {
    const user = await storage.getUserById(userId);
    if (!user || !user.isSuperAdmin) {
      return false;
    }
    return await bcrypt.compare(password, user.password);
  } catch (error) {
    console.error("Erro ao verificar password:", error);
    return false;
  }
};

const BCRYPT_ROUNDS = 14;

export function setupAdminManagementRoutes(app: any) {
  // Obter todos os utilizadores (apenas super admins)
  app.get("/api/admin/users/all", requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const users = await storage.getAllUsersForAdmin();
      
      // Remover passwords e dados sensíveis
      const sanitizedUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Erro ao obter utilizadores:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo utilizador (apenas super admins)
  app.post("/api/admin/users/create", requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const validationResult = createUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { confirmPassword, password, email, ...userData } = validationResult.data;

      // Verificar password do super admin
      const isValidPassword = await verifySuperAdminPassword((req as any).user.id, confirmPassword);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: "Password de super administrador incorrecta" 
        });
      }

      // Verificar se já existe utilizador com este email
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          message: "Já existe um utilizador com este email",
        });
      }

      // Hash da password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Criar utilizador
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        emailVerified: true,
        isActive: true,
        // Passando campos adicionais que storage.createUser deve tratar
        // @ts-ignore
        subscriptionPlan: userData.subscriptionPlan,
        credits: userData.subscriptionPlan === "trial" ? 50 : 
                userData.subscriptionPlan === "starter" ? 200 :
                userData.subscriptionPlan === "pro" ? 1000 : 5000,
        nif: userData.nif,
        ...userData,
      });

      // Remover password da resposta
      const { password: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Erro ao criar utilizador:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Editar utilizador (apenas super admins)
  app.put("/api/admin/users/:userId", requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const validationResult = editUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { confirmPassword, ...updateData } = validationResult.data;

      // Verificar password do super admin
      const isValidPassword = await verifySuperAdminPassword((req as any).user.id, confirmPassword);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: "Password de super administrador incorrecta" 
        });
      }

      // Verificar se o utilizador existe
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Utilizador não encontrado" });
      }

      // Não permitir editar super admins
      if (existingUser.isSuperAdmin) {
        return res.status(403).json({ 
          message: "Não é possível editar utilizadores super administradores" 
        });
      }

      // Actualizar utilizador
      const updatedUser = await storage.updateUser(userId, {
        ...updateData,
        // @ts-ignore
        updatedAt: new Date(),
      });

      // Remover password da resposta
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Erro ao actualizar utilizador:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Apagar utilizador (apenas super admins)
  app.delete("/api/admin/users/:userId", requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const validationResult = deleteUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Password de confirmação é obrigatória",
        });
      }

      const { confirmPassword } = validationResult.data;

      // Verificar password do super admin
      const isValidPassword = await verifySuperAdminPassword((req as any).user.id, confirmPassword);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: "Password de super administrador incorrecta" 
        });
      }

      // Verificar se o utilizador existe
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Utilizador não encontrado" });
      }

      // Não permitir apagar super admins
      if (existingUser.isSuperAdmin) {
        return res.status(403).json({ 
          message: "Não é possível apagar utilizadores super administradores" 
        });
      }

      // Apagar utilizador
      await storage.deleteUser(userId);

      res.json({ message: "Utilizador apagado com sucesso" });
    } catch (error) {
      console.error("Erro ao apagar utilizador:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Reset de password (apenas super admins)
  app.post("/api/admin/users/:userId/reset-password", requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const validationResult = resetPasswordSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { newPassword, confirmPassword } = validationResult.data;

      // Verificar password do super admin
      const isValidPassword = await verifySuperAdminPassword((req as any).user.id, confirmPassword);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: "Password de super administrador incorrecta" 
        });
      }

      // Verificar se o utilizador existe
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Utilizador não encontrado" });
      }

      // Não permitir alterar password de super admins
      if (existingUser.isSuperAdmin) {
        return res.status(403).json({ 
          message: "Não é possível alterar a password de utilizadores super administradores" 
        });
      }

      // Hash da nova password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Actualizar password
      await storage.updateUser(userId, {
        password: hashedPassword,
        // @ts-ignore
        updatedAt: new Date(),
      });

      res.json({ message: "Password alterada com sucesso" });
    } catch (error) {
      console.error("Erro ao alterar password:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Schema para alteração de role
  const changeRoleSchema = z.object({
    isAdmin: z.boolean(),
    isSuperAdmin: z.boolean(),
    confirmPassword: z.string().min(1, "Password de confirmação é obrigatória"),
    reason: z.string().min(10, "Justificação deve ter pelo menos 10 caracteres"),
  });

  // Alterar role de utilizador (apenas super admins)
  app.put("/api/admin/users/:userId/role", requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const validationResult = changeRoleSchema.safeParse(req.body);
      
      // Early return para dados inválidos
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { isAdmin, isSuperAdmin, confirmPassword, reason } = validationResult.data;

      // Early return para password incorrecta
      const isValidPassword = await verifySuperAdminPassword((req as any).user.id, confirmPassword);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: "Password de super administrador incorrecta" 
        });
      }

      // Early return se utilizador não existe
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Utilizador não encontrado" });
      }

      // Early return para prevenir auto-alteração
      if (existingUser.id === (req as any).user.id) {
        return res.status(403).json({ 
          message: "Não é possível alterar os próprios privilégios" 
        });
      }

      // Log da alteração de role para auditoria
      console.log(`ROLE CHANGE: Super admin ${(req as any).user.email} changing role of ${existingUser.email} - isAdmin: ${existingUser.isAdmin} -> ${isAdmin}, isSuperAdmin: ${existingUser.isSuperAdmin} -> ${isSuperAdmin}. Reason: ${reason}`);

      // Actualizar role do utilizador
      const updatedUser = await storage.updateUser(userId, {
        isAdmin,
        isSuperAdmin,
        // @ts-ignore
        updatedAt: new Date(),
      });

      // Remover informações sensíveis da resposta
      const { password, ...safeUser } = updatedUser;
      
      res.json({
        message: "Role do utilizador alterado com sucesso",
        user: safeUser
      });

    } catch (error) {
      console.error("Erro ao alterar role do utilizador:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
}