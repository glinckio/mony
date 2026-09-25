import { ApiProperty } from "@nestjs/swagger";

import { DebtInstallmentDto } from "./debt-installment.dto";
import { DebtDto } from "./debt.dto";

export class DebtWithInstallmentsDto extends DebtDto {
  @ApiProperty({ type: [DebtInstallmentDto], description: "Ordered by installmentNo" })
  installments!: DebtInstallmentDto[];
}
