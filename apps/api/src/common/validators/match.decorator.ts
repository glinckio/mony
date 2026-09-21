import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from "class-validator";

@ValidatorConstraint({ name: "Match" })
class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    const [relatedProperty] = args.constraints as [string];
    const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedProperty] = args.constraints as [string];
    return `${args.property} must match ${relatedProperty}`;
  }
}

export function Match(relatedProperty: string, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [relatedProperty],
      validator: MatchConstraint,
    });
  };
}
