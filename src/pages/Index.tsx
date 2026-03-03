import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, CreditCard, Users, LayoutDashboard, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ThemeToggle from '@/components/ThemeToggle';

const navItems = [
  { to: '/vendas', label: 'Vendas', description: 'Análise de vendas, VGV, comissões e pipeline', icon: ShoppingCart },
  { to: '/parcelas', label: 'Parcelas', description: 'Comissões recebidas, repasses e parcelas', icon: CreditCard },
  { to: '/vendedores', label: 'Vendedores', description: 'Atividade, funil de conversão e produtividade', icon: Users },
  { to: '/visao-geral', label: 'Visão Geral', description: 'Cruzamento completo de todas as fontes', icon: LayoutDashboard },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart3 className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
              Adesão Pro
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Dashboard inteligente para sua corretora de consórcio.
            Suba suas planilhas e visualize tudo em segundos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {navItems.map((item, i) => (
            <Link key={item.to} to={item.to} className="group" style={{ animationDelay: `${i * 100}ms` }}>
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5 group-focus:ring-2 group-focus:ring-primary animate-fade-in" style={{ animationDelay: `${(i + 1) * 100}ms` }}>
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-lg">{item.label}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground py-4">
        © {new Date().getFullYear()} Adesão Pro — Dados processados apenas no navegador.
      </footer>
    </div>
  );
};

export default Index;
