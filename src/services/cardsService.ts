import * as cardRepository from "../repositories/cardRepository.js";
import { findByApiKey } from "../repositories/companyRepository.js";
import { findById } from "../repositories/employeeRepository.js";
import { faker } from "@faker-js/faker";
import dayjs from "dayjs";
import bcrypt from "bcrypt";

export async function create(id: number, type: cardRepository.TransactionTypes, apiKey: string) {
    const company = await findByApiKey(apiKey);
    if (!company) throw { type: 'invalid company', message: 'Company does not exist' } 

    const employee = await findById(id);
    if (!employee) throw { type: 'invalid employee', message: 'Employee does not exist' } 

    const employeeCard = await cardRepository.findByTypeAndEmployeeId(type, id);
    if (employeeCard) throw { type: 'existent card', message: 'The user already has a card of this type' } 

    const { cardInfo, securityCode } = generateCardInfo(employee.fullName, employee.id, type);

    await cardRepository.insert(cardInfo);
    return { securityCode };
}   

function generateCardInfo(
	fullName: string,
	id: number,
	type: cardRepository.TransactionTypes
) {
	const cardNumber = faker.finance.creditCardNumber('mastercard');
	const securityCode = faker.finance.creditCardCVV();
	const nameArray = fullName.toUpperCase().split(' ');
	const cardholderName = createCardholderName(nameArray);
	const expirationDate = dayjs().add(5, 'y').format('MM/YY');

	const cardInfo = {
		employeeId: id,
		number: cardNumber,
		cardholderName,
		securityCode: bcrypt.hashSync(securityCode, 8),
		expirationDate,
		password: null,
		isVirtual: false,
		originalCardId: null,
		isBlocked: false,
		type: type,
	};

	return { cardInfo, securityCode };
}

function createCardholderName(nameArray: string[]) {
	for (let i = 1; i <= nameArray.length - 2; i++) {
		if (nameArray[i].length <= 2) {
			nameArray.splice(i, 1);
		} else {
			nameArray[i] = nameArray[i].substring(0, 1);
		}
	}

	return nameArray.join(' ');
}

export async function activate(id: number, CVC: string, password: string) {
    const card = await cardRepository.findById(id);
    if (!card) throw { type: 'nonexistent card', message: 'The card is not registered' }

    if (dayjs().format('MM/YY') > card.expirationDate) throw { type: 'expired card', message: 'The card is expired' } 

    if (card.password !== null) throw { type: 'activated card', message: 'The card is already activated' }

    if (!bcrypt.compareSync(CVC, card.securityCode)) throw { type: 'incorrect CVC', message: 'Incorrect CVC' }

    await cardRepository.update(id, { password })
}