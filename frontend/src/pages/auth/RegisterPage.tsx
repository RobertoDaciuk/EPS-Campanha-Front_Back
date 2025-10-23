/**
 * @file pages/auth/RegisterPage.tsx
 * @version 2.0.0
 * @description Página de registro
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EyeIcon, EyeOffIcon, UserPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { RegisterForm } from '@/types'
import { getErrorMessage, formatCPF, formatCNPJ, formatPhone, isValidCPF, isValidCNPJ } from '@/lib/utils'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  cpf: z.string().refine(isValidCPF, 'CPF inválido'),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos'),
  opticName: z.string().min(2, 'Nome da ótica deve ter pelo menos 2 caracteres'),
  opticCNPJ: z.string().refine(isValidCNPJ, 'CNPJ inválido'),
  terms: z.boolean().refine(val => val, 'Você deve aceitar os termos'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
})

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const watchCPF = watch('cpf')
  const watchCNPJ = watch('opticCNPJ')
  const watchWhatsApp = watch('whatsapp')

  // Auto-format fields
  React.useEffect(() => {
    if (watchCPF) {
      setValue('cpf', formatCPF(watchCPF), { shouldValidate: true })
    }
  }, [watchCPF, setValue])

  React.useEffect(() => {
    if (watchCNPJ) {
      setValue('opticCNPJ', formatCNPJ(watchCNPJ), { shouldValidate: true })
    }
  }, [watchCNPJ, setValue])

  React.useEffect(() => {
    if (watchWhatsApp) {
      setValue('whatsapp', formatPhone(watchWhatsApp), { shouldValidate: true })
    }
  }, [watchWhatsApp, setValue])

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data)
      toast.success('Conta criada com sucesso!', 'Bem-vindo ao EPS Campanhas')
      navigate('/login')
    } catch (error) {
      toast.error(getErrorMessage(error), 'Erro no cadastro')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-eps-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">E</span>
            </div>
            <CardTitle className="text-2xl">Crie sua conta</CardTitle>
            <CardDescription>
              Cadastre-se no EPS Campanhas e comece a ganhar pontos
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name" required>Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  {...register('name')}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <Label htmlFor="cpf" required>CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  {...register('cpf')}
                  error={!!errors.cpf}
                  helperText={errors.cpf?.message}
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp" required>WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  {...register('whatsapp')}
                  error={!!errors.whatsapp}
                  helperText={errors.whatsapp?.message}
                />
              </div>

              {/* Nome da Ótica */}
              <div className="space-y-2">
                <Label htmlFor="opticName" required>Nome da Ótica</Label>
                <Input
                  id="opticName"
                  placeholder="Nome da sua ótica"
                  {...register('opticName')}
                  error={!!errors.opticName}
                  helperText={errors.opticName?.message}
                />
              </div>

              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="opticCNPJ" required>CNPJ da Ótica</Label>
                <Input
                  id="opticCNPJ"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  {...register('opticCNPJ')}
                  error={!!errors.opticCNPJ}
                  helperText={errors.opticCNPJ?.message}
                />
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" required>Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    {...register('password')}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" required>Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    {...register('confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Termos */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  {...register('terms')}
                  className="h-4 w-4 text-eps-600 focus:ring-eps-500 border-gray-300 rounded mt-1"
                />
                <Label htmlFor="terms" className="ml-2 text-sm cursor-pointer">
                  Aceito os{' '}
                  <Link to="#" className="text-eps-600 hover:text-eps-700">
                    termos de uso
                  </Link>{' '}
                  e{' '}
                  <Link to="#" className="text-eps-600 hover:text-eps-700">
                    política de privacidade
                  </Link>
                </Label>
              </div>
              {errors.terms && (
                <p className="text-xs text-red-500">{errors.terms.message}</p>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                loading={isSubmitting}
              >
                <UserPlusIcon className="w-4 h-4 mr-2" />
                Criar Conta
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-center">
            <Link
              to="/login"
              className="text-sm text-eps-600 hover:text-eps-700 transition-colors"
            >
              Já tem uma conta? <span className="font-medium">Faça login</span>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

export default RegisterPage
