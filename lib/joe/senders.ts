import { JoeOutputValidators } from '../../types'

export const JOE_OUTPUT_VALIDATORS = Symbol('Joe Output Validators')

export function createValidatedSender(sender: 'json' | 'jsonp') {
	return function(obj: any) {
		if(this[JOE_OUTPUT_VALIDATORS]) {
			const validators: JoeOutputValidators = this[JOE_OUTPUT_VALIDATORS]
			const schema = validators[this.statusCode]

			if(schema) {
				const { error } = schema.validate(obj)
				if(error) {
					console.error(error)
					return this.status(500).send('500 Server Error: Response did not validate.')
				}
			}
		}
		return this[sender](obj)
	}
}