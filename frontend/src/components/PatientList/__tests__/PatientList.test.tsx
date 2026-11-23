// Teste sobre um componente JÁ EXISTENTE no sistema (fora do módulo de estoque).
// Ele comprova a falha DEF-01, encontrada na análise do código:
// calculateAge() chama birthdate.split("/") sem verificar se a data existe,
// então um paciente sem data de nascimento derruba a lista inteira.
//
// Um Error Boundary de teste captura o erro para que ele possa ser verificado.
// Quando o defeito for corrigido, o CT-F22 deve ser reescrito para esperar a idade "-".
import { Component } from "react";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import axios from "axios";
import PatientsList from "..";

jest.mock("axios");
// O Link do react-router é simulado: o teste foca só no componente PatientList
jest.mock("react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

class CapturaErro extends Component<{ children: ReactNode }, { erro: string | null }> {
  state = { erro: null };
  static getDerivedStateFromError(erro: Error) {
    return { erro: erro.message };
  }
  render() {
    return this.state.erro ? <p>Erro capturado: {this.state.erro}</p> : this.props.children;
  }
}

describe("PatientList (componente existente)", () => {
  test("CT-F21: lista paciente com data de nascimento e calcula a idade", async () => {
    mockedAxios.get.mockResolvedValue({
      data: [{ id: "1", fullName: "João", phone: "48999990000", birthdate: "11/12/1980", healthInsurance: "Unimed" }],
    });

    render(<PatientsList />);

    expect(await screen.findByText("João")).toBeInTheDocument();
    expect(screen.getByText(/anos/)).toBeInTheDocument();
  });

  test("CT-F22 (DEF-01): paciente sem data de nascimento quebra a lista — falha confirmada", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockedAxios.get.mockResolvedValue({
      data: [{ id: "2", fullName: "Maria", phone: "48988880000" }], // sem birthdate
    });

    render(
      <CapturaErro>
        <PatientsList />
      </CapturaErro>,
    );

    // Resultado obtido: a tela some e o erro abaixo é lançado.
    // Resultado esperado (após a correção): Maria aparece com idade "-".
    expect(
      await screen.findByText("Erro capturado: Cannot read properties of undefined (reading 'split')"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Maria")).not.toBeInTheDocument();
  });
});
