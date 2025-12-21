'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Shield, Lock, HardDrive, Mail, Trash2, Languages } from 'lucide-react';

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header backHref="/" title="Privacy Policy / Política de Privacidade" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto p-6 space-y-8">
          {/* Company Info */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Moodboard Manager</h1>
            <p className="text-sm text-muted-foreground">
              Zoch Tecnologia - CNPJ 49.186.262/0001-81
            </p>
            <p className="text-sm text-muted-foreground">
              Published / Publicação: December 2025 / Dezembro de 2025 • Version / Versão: 1.0
            </p>

            {/* Language Navigation */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <Languages className="h-5 w-5 text-muted-foreground" />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => scrollToSection('english')}
              >
                English
              </Button>
              <span className="text-muted-foreground">|</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => scrollToSection('portuguese')}
              >
                Português
              </Button>
            </div>
          </div>

          <Separator />

          {/* ==================== ENGLISH VERSION ==================== */}
          <div id="english" className="space-y-6 scroll-mt-6">
            <h2 className="text-2xl font-bold">English Version</h2>

            {/* English Key Points */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Key Privacy Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex gap-3">
                    <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">100% Client-Side</p>
                      <p className="text-sm text-muted-foreground">
                        Moodboard Manager operates entirely in your browser or device.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <HardDrive className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Zero Server Storage</p>
                      <p className="text-sm text-muted-foreground">
                        Zoch Tecnologia does not collect, process, or store your personal data, login email, or Drive content files on our servers.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Email for Authentication Only</p>
                      <p className="text-sm text-muted-foreground">
                        Your email is used by Google to identify you and initiate the login session; it is not stored in our systems.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Your Data is Yours</p>
                      <p className="text-sm text-muted-foreground">
                        Your moodboard content is stored directly in your Google Drive, in a hidden folder (drive.appdata), ensuring only the app can access it for sync. We have no access to it, only you do.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Trash2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">No Sharing</p>
                      <p className="text-sm text-muted-foreground">
                        We do not share your data with third parties or business partners.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h3 className="text-xl font-semibold pt-4">Full Version</h3>

            <Card>
              <CardHeader>
                <CardTitle>1. Introduction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  This Privacy Policy describes how the Moodboard Manager application (the &ldquo;Application&rdquo;), owned and operated by Zoch Tecnologia, collects, uses, and protects user information. Recognizing that your privacy is important, Moodboard Manager was designed with privacy as a core principle.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Fundamental Privacy Principle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  Moodboard Manager is a client-side application. This means that no personal data, Google Drive files, or user account information is sent, stored, or processed on Zoch Tecnologia&apos;s servers. All data processing and file synchronization occurs directly in the user&apos;s browser (client-side) or is managed by Google Drive.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Information Collected and Its Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Moodboard Manager requests access to specific information from your Google Account strictly for basic functionality purposes:
                </p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">A. Identification Data (Collected by Google, Accessed by App)</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li><strong>Information Accessed:</strong> User&apos;s email address.</li>
                      <li><strong>Access Scope:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">https://www.googleapis.com/auth/userinfo.email</code></li>
                      <li><strong>Use:</strong> The email is accessed exclusively by the Application to identify the user and manage the login session in the client-side environment. Zoch Tecnologia does not store this email address on its servers.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">B. Google Drive Data (App Content Storage)</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li><strong>Information Accessed:</strong> Application synchronization data (metadata and content of your moodboards).</li>
                      <li><strong>Access Scope:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">https://www.googleapis.com/auth/drive.appdata</code></li>
                      <li><strong>Use:</strong> This scope is used to store files in a special, hidden Application Data Folder within your Google Drive. These files are used exclusively to synchronize your content across different devices where you use Moodboard Manager. These files are not visible in your standard Google Drive interface, ensuring there is no accidental user interference with the application data.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Data Sharing and Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li><strong>Sharing:</strong> Moodboard Manager does not share your personal data or Drive content data with third parties.</li>
                  <li><strong>Storage:</strong> As mentioned, Zoch Tecnologia does not store your data on its servers. The storage of Moodboard Manager synchronization data is done directly in your Google Drive account, under your responsibility and control (via API, in the hidden folder).</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Data Deletion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  Since Zoch Tecnologia does not store your data on servers, deletion is managed as follows:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li><strong>Drive Data Deletion:</strong> To remove synchronization data from your Google account, you must revoke Moodboard Manager&apos;s access to your account through your Google Account Security settings. By revoking access, Google may automatically remove data from the &ldquo;Application Data Folder.&rdquo;</li>
                  <li><strong>Account/Usage Deletion:</strong> Uninstalling or discontinuing use of Moodboard Manager terminates the application&apos;s access to your Drive data.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  If you have questions about this Privacy Policy or Moodboard Manager&apos;s data practices, contact Zoch Tecnologia by email: <a href="mailto:contato@zochtecnologia.com" className="text-primary hover:underline">contato@zochtecnologia.com</a>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Legal Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  This Privacy Policy may be updated periodically to reflect changes in application practices or compliance with legal requirements. We recommend that you review this policy regularly to stay informed about how we protect your information.
                </p>
                <p>
                  Continued use of Moodboard Manager after any changes to this Privacy Policy constitutes your acceptance of those changes.
                </p>
                <p>
                  THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                </p>
                </CardContent>
            </Card>
          </div>

          <Separator />

          {/* ==================== PORTUGUESE VERSION ==================== */}
          <div id="portuguese" className="space-y-6 scroll-mt-6">
            <h2 className="text-2xl font-bold">Versão em Português</h2>

            {/* Portuguese Key Points */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Resumo dos Pontos Chave de Privacidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex gap-3">
                    <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">100% no Seu Navegador</p>
                      <p className="text-sm text-muted-foreground">
                        O Moodboard Manager opera 100% no seu navegador ou dispositivo.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <HardDrive className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Zero Armazenamento em Nossos Servidores</p>
                      <p className="text-sm text-muted-foreground">
                        A Zoch Tecnologia não coleta, processa ou armazena em seus servidores seus dados pessoais, e-mail de login, ou arquivos de conteúdo do Drive.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">E-mail Apenas para Autenticação</p>
                      <p className="text-sm text-muted-foreground">
                        Seu e-mail serve para o Google identificar você e iniciar a sessão de login; ele não é armazenado em nossos sistemas.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Os Dados São Seus</p>
                      <p className="text-sm text-muted-foreground">
                        O conteúdo dos seus moodboards é armazenado diretamente no seu Google Drive, em uma pasta oculta (drive.appdata), garantindo que apenas o aplicativo possa acessá-lo para sincronização. Nós não temos nenhum acesso à eles, apenas você tem.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Trash2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Não Compartilhamos</p>
                      <p className="text-sm text-muted-foreground">
                        Nós não compartilhamos seus dados com terceiros ou parceiros comerciais.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h3 className="text-xl font-semibold pt-4">Versão Completa</h3>

            <Card>
              <CardHeader>
                <CardTitle>1. Introdução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  Esta Política de Privacidade descreve como o aplicativo Moodboard Manager (o &ldquo;Aplicativo&rdquo;), de propriedade e operado por Zoch Tecnologia, coleta, usa e protege as informações dos usuários. Reconhecendo que a sua privacidade é importante, o Moodboard Manager foi projetado com a privacidade como princípio central.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Princípio Fundamental de Privacidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  O Moodboard Manager é um aplicativo client-side. Isso significa que nenhum dado pessoal, arquivos do Google Drive ou informações de conta do usuário são enviados, armazenados ou processados nos servidores da Zoch Tecnologia. Todo o processamento de dados e a sincronização de arquivos ocorrem diretamente no navegador do usuário (client-side) ou são gerenciados pelo Google Drive.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Informações Coletadas e Seu Uso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  O Moodboard Manager solicita acesso a informações específicas da sua Conta Google estritamente para fins de funcionalidade básica:
                </p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">A. Dados de Identificação (Coletados pelo Google, Acessados pelo App)</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li><strong>Informação Acessada:</strong> Endereço de e-mail do usuário.</li>
                      <li><strong>Escopo de Acesso:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">https://www.googleapis.com/auth/userinfo.email</code></li>
                      <li><strong>Uso:</strong> O e-mail é acessado exclusivamente pelo Aplicativo para identificar o usuário e gerenciar a sessão de login no ambiente client-side. A Zoch Tecnologia não armazena este endereço de e-mail em seus servidores.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">B. Dados do Google Drive (Armazenamento de Conteúdo do App)</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li><strong>Informação Acessada:</strong> Dados de sincronização do aplicativo (metadados e conteúdo dos seus moodboards).</li>
                      <li><strong>Escopo de Acesso:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">https://www.googleapis.com/auth/drive.appdata</code></li>
                      <li><strong>Uso:</strong> Este escopo é usado para armazenar arquivos em uma Pasta de Dados do Aplicativo especial e oculta dentro do seu Google Drive. Estes arquivos são usados exclusivamente para sincronizar seu conteúdo entre diferentes dispositivos onde você usa o Moodboard Manager. Estes arquivos não são visíveis na sua interface padrão do Google Drive, garantindo que não haja interferência acidental do usuário nos dados do aplicativo.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Compartilhamento e Armazenamento de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li><strong>Compartilhamento:</strong> O Moodboard Manager não compartilha seus dados pessoais ou dados de conteúdo do Drive com terceiros.</li>
                  <li><strong>Armazenamento:</strong> Conforme mencionado, a Zoch Tecnologia não armazena seus dados em seus servidores. O armazenamento dos dados de sincronização do Moodboard Manager é feito diretamente na sua conta Google Drive, sob sua responsabilidade e controle (via API, na pasta oculta).</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Exclusão de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  Uma vez que a Zoch Tecnologia não armazena seus dados em servidores, a exclusão é gerenciada da seguinte forma:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li><strong>Exclusão de Dados do Drive:</strong> Para remover os dados de sincronização da sua conta Google, você deve revogar o acesso do Moodboard Manager à sua conta através das configurações de Segurança da sua Conta Google. Ao revogar o acesso, o Google pode remover automaticamente os dados da &ldquo;Pasta de Dados do Aplicativo&rdquo;.</li>
                  <li><strong>Exclusão de Conta/Uso:</strong> A desinstalação ou interrupção do uso do Moodboard Manager encerra o acesso do aplicativo aos seus dados do Drive.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Contato</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Se você tiver dúvidas sobre esta Política de Privacidade ou sobre as práticas de dados do Moodboard Manager, entre em contato com a Zoch Tecnologia pelo e-mail: <a href="mailto:contato@zochtecnologia.com" className="text-primary hover:underline">contato@zochtecnologia.com</a>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Aviso Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças nas práticas do aplicativo ou em conformidade com requisitos legais. Recomendamos que você revise esta política regularmente para se manter informado sobre como protegemos suas informações.
                </p>
                <p>
                  O uso contínuo do Moodboard Manager após quaisquer alterações nesta Política de Privacidade constitui sua aceitação dessas alterações.
                </p>
                <p>
                  ESTE SOFTWARE É FORNECIDO &ldquo;NO ESTADO EM QUE SE ENCONTRA&rdquo;, SEM GARANTIAS DE QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS, INCLUINDO, MAS NÃO SE LIMITANDO ÀS GARANTIAS DE COMERCIALIZAÇÃO, ADEQUAÇÃO A UM PROPÓSITO ESPECÍFICO E NÃO VIOLAÇÃO. EM NENHUMA HIPÓTESE OS AUTORES OU DETENTORES DOS DIREITOS SERÃO RESPONSÁVEIS POR QUALQUER REIVINDICAÇÃO, DANO OU OUTRA RESPONSABILIDADE, SEJA EM UMA AÇÃO DE CONTRATO, ATO ILÍCITO OU DE OUTRA FORMA, DECORRENTE DE, FORA DE OU EM CONEXÃO COM O SOFTWARE OU O USO OU OUTRAS NEGOCIAÇÕES NO SOFTWARE.
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Footer Note */}
          <div className="text-center text-sm text-muted-foreground py-6">
            <p>Last updated: December 2025 / Última atualização: Dezembro de 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}
