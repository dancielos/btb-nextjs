'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { custom, z } from 'zod';

const InvoiceSchema = z.object({
	id: z.string(),
	customerId: z.string(),
	amount: z.coerce.number(),
	status: z.enum(['pending', 'paid']),
	date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export const createInvoice = async function (formData: FormData) {
	const rawFormData = Object.fromEntries(formData.entries());
	const { amount, customerId, status } = CreateInvoice.parse(rawFormData);

	const amountInCents = amount * 100;
	const date = new Date().toISOString().split('T')[0];

	try {
		await sql`
    INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
	} catch (error) {
		return {
			message: 'Database error: Failed to create invoice.',
		};
	}

	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices');
	// console.log(rawFormData);
	// console.log(typeof rawFormData.amount);
};

const UpdateInvoice = InvoiceSchema.omit({ date: true });

export async function updateInvoice(formData: FormData) {
	const rawFormData = Object.fromEntries(formData.entries());
	const { id, customerId, amount, status } = UpdateInvoice.parse(rawFormData);

	const amountInCents = amount * 100;
	try {
		await sql`
			UPDATE invoices
			SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
			WHERE id = ${id}
		`;
	} catch (error) {
		return { message: 'Database error: Failed to update invoice.' };
	}

	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices');
}

const DeleteInvoice = InvoiceSchema.pick({ id: true });

export async function deleteInvoice(formData: FormData) {
	// throw new Error('Testing error');
	const { id } = DeleteInvoice.parse({ id: formData.get('id') });
	try {
		await sql`DELETE FROM invoices WHERE id = ${id}`;
	} catch (error) {
		return { message: 'Database error: Failed to delete an invoice.' };
	}
	revalidatePath('/dashboard/invoices');
}
