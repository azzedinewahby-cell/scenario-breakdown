import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regError, setRegError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (err) => setLoginError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (err) => setRegError(err.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Film className="h-8 w-8 text-primary" />
            <span className="text-2xl font-serif font-semibold">Production</span>
          </div>
          <p className="text-muted-foreground text-sm text-center">
            Outil de dépouillement de scénario
          </p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Créer un compte</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Se connecter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginMutation.mutate({ email: loginEmail, password: loginPassword })}
                  />
                </div>
                {loginError && <p className="text-sm text-destructive">{loginError}</p>}
                <Button
                  className="w-full"
                  disabled={loginMutation.isPending}
                  onClick={() => {
                    setLoginError("");
                    loginMutation.mutate({ email: loginEmail, password: loginPassword });
                  }}
                >
                  {loginMutation.isPending ? "Connexion…" : "Se connecter"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Créer un compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="reg-name">Nom complet</Label>
                  <Input
                    id="reg-name"
                    placeholder="Azzedine Wahbi"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-password">Mot de passe</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="6 caractères minimum"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                  />
                </div>
                {regError && <p className="text-sm text-destructive">{regError}</p>}
                <Button
                  className="w-full"
                  disabled={registerMutation.isPending}
                  onClick={() => {
                    setRegError("");
                    registerMutation.mutate({ email: regEmail, password: regPassword, name: regName });
                  }}
                >
                  {registerMutation.isPending ? "Création…" : "Créer mon compte"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
