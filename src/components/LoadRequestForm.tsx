import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { LoadRequestInput } from '../types'

export const emptyLoadRequest: LoadRequestInput = {
  requesterCompany: '', requesterName: '', requesterEmail: '', requesterPhone: '',
  pickupCompany: '', pickupAddress: '', pickupCity: '', pickupState: '', pickupPostalCode: '', pickupContact: '', pickupPhone: '', pickupDate: '', pickupTimeWindow: '', pickupMethod: '', pickupInstructions: '',
  deliveryCompany: '', deliveryAddress: '', deliveryCity: '', deliveryState: '', deliveryPostalCode: '', deliveryContact: '', deliveryPhone: '', deliveryDate: '', deliveryTimeWindow: '', unloadingMethod: '', deliveryInstructions: '',
  freightDescription: '', pieces: '', estimatedWeight: '', dimensions: '', equipmentRequirements: '', tarpingRequirements: '', securementRequirements: '', declaredValue: '', referenceNumber: '', additionalInstructions: '',
}

type Props = {
  initialValues?: Partial<LoadRequestInput>
  submitting: boolean
  submitLabel: string
  secondaryLabel?: string
  onSubmit: (values: LoadRequestInput, action: 'primary' | 'secondary') => Promise<void>
  onValuesChange?: (values: LoadRequestInput) => void
  publicMode?: boolean
}

export function LoadRequestForm({ initialValues, submitting, submitLabel, secondaryLabel, onSubmit, onValuesChange, publicMode = false }: Props) {
  const [values, setValues] = useState<LoadRequestInput>({ ...emptyLoadRequest, ...initialValues })
  const [action, setAction] = useState<'primary' | 'secondary'>('primary')

  useEffect(() => {
    setValues((current) => ({ ...current, ...initialValues }))
  }, [initialValues])

  useEffect(() => {
    onValuesChange?.(values)
  }, [values, onValuesChange])

  const update = (key: keyof LoadRequestInput, value: string) => setValues((current) => ({ ...current, [key]: value }))
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit(values, action)
  }

  return (
    <form className={`load-request-form ${publicMode ? 'load-request-form--public' : ''}`} onSubmit={handleSubmit}>
      <fieldset>
        <legend><span>1</span> Requester information</legend>
        <div className="form-grid form-grid--three">
          <label>Company<input value={values.requesterCompany} onChange={(e) => update('requesterCompany', e.target.value)} placeholder="Company or customer name" /></label>
          <label>Contact name<input required value={values.requesterName} onChange={(e) => update('requesterName', e.target.value)} /></label>
          <label>Email<input required type="email" value={values.requesterEmail} onChange={(e) => update('requesterEmail', e.target.value)} /></label>
          <label>Phone<input value={values.requesterPhone} onChange={(e) => update('requesterPhone', e.target.value)} /></label>
          <label>Reference / PO<input value={values.referenceNumber} onChange={(e) => update('referenceNumber', e.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>2</span> Pickup</legend>
        <div className="form-grid form-grid--three">
          <label>Pickup company<input value={values.pickupCompany} onChange={(e) => update('pickupCompany', e.target.value)} /></label>
          <label className="form-grid__wide">Street address<input required value={values.pickupAddress} onChange={(e) => update('pickupAddress', e.target.value)} /></label>
          <label>City<input required value={values.pickupCity} onChange={(e) => update('pickupCity', e.target.value)} /></label>
          <label>State<input required maxLength={2} value={values.pickupState} onChange={(e) => update('pickupState', e.target.value.toUpperCase())} /></label>
          <label>ZIP<input value={values.pickupPostalCode} onChange={(e) => update('pickupPostalCode', e.target.value)} /></label>
          <label>Pickup date<input type="date" value={values.pickupDate} onChange={(e) => update('pickupDate', e.target.value)} /></label>
          <label>Appointment window<input value={values.pickupTimeWindow} onChange={(e) => update('pickupTimeWindow', e.target.value)} placeholder="8:00 AM–10:00 AM" /></label>
          <label>Loading method<input value={values.pickupMethod} onChange={(e) => update('pickupMethod', e.target.value)} placeholder="Forklift, crane, dock..." /></label>
          <label>Contact<input value={values.pickupContact} onChange={(e) => update('pickupContact', e.target.value)} /></label>
          <label>Contact phone<input value={values.pickupPhone} onChange={(e) => update('pickupPhone', e.target.value)} /></label>
          <label className="form-grid__full">Pickup instructions<textarea value={values.pickupInstructions} onChange={(e) => update('pickupInstructions', e.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>3</span> Delivery</legend>
        <div className="form-grid form-grid--three">
          <label>Delivery company<input value={values.deliveryCompany} onChange={(e) => update('deliveryCompany', e.target.value)} /></label>
          <label className="form-grid__wide">Street address<input required value={values.deliveryAddress} onChange={(e) => update('deliveryAddress', e.target.value)} /></label>
          <label>City<input required value={values.deliveryCity} onChange={(e) => update('deliveryCity', e.target.value)} /></label>
          <label>State<input required maxLength={2} value={values.deliveryState} onChange={(e) => update('deliveryState', e.target.value.toUpperCase())} /></label>
          <label>ZIP<input value={values.deliveryPostalCode} onChange={(e) => update('deliveryPostalCode', e.target.value)} /></label>
          <label>Delivery date<input type="date" value={values.deliveryDate} onChange={(e) => update('deliveryDate', e.target.value)} /></label>
          <label>Appointment window<input value={values.deliveryTimeWindow} onChange={(e) => update('deliveryTimeWindow', e.target.value)} placeholder="By 4:00 PM" /></label>
          <label>Unloading method<input value={values.unloadingMethod} onChange={(e) => update('unloadingMethod', e.target.value)} /></label>
          <label>Contact<input value={values.deliveryContact} onChange={(e) => update('deliveryContact', e.target.value)} /></label>
          <label>Contact phone<input value={values.deliveryPhone} onChange={(e) => update('deliveryPhone', e.target.value)} /></label>
          <label className="form-grid__full">Delivery instructions<textarea value={values.deliveryInstructions} onChange={(e) => update('deliveryInstructions', e.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>4</span> Freight details</legend>
        <div className="form-grid form-grid--three">
          <label className="form-grid__full">Freight description<textarea required value={values.freightDescription} onChange={(e) => update('freightDescription', e.target.value)} placeholder="Describe exactly what is being transported" /></label>
          <label>Pieces<input inputMode="numeric" value={values.pieces} onChange={(e) => update('pieces', e.target.value)} /></label>
          <label>Estimated weight (lb)<input inputMode="decimal" value={values.estimatedWeight} onChange={(e) => update('estimatedWeight', e.target.value)} /></label>
          <label>Dimensions<input value={values.dimensions} onChange={(e) => update('dimensions', e.target.value)} placeholder="L × W × H" /></label>
          <label>Equipment requirements<input value={values.equipmentRequirements} onChange={(e) => update('equipmentRequirements', e.target.value)} /></label>
          <label>Tarping requirements<input value={values.tarpingRequirements} onChange={(e) => update('tarpingRequirements', e.target.value)} /></label>
          <label>Securement requirements<input value={values.securementRequirements} onChange={(e) => update('securementRequirements', e.target.value)} /></label>
          <label>Declared value<input inputMode="decimal" value={values.declaredValue} onChange={(e) => update('declaredValue', e.target.value)} /></label>
          <label className="form-grid__full">Additional instructions<textarea value={values.additionalInstructions} onChange={(e) => update('additionalInstructions', e.target.value)} /></label>
        </div>
      </fieldset>

      {publicMode && <label className="accuracy-check"><input type="checkbox" required /> I confirm this information is accurate to the best of my knowledge.</label>}

      <div className="load-request-form__actions">
        {secondaryLabel && <button className="secondary-button" type="submit" disabled={submitting} onClick={() => setAction('secondary')}>{secondaryLabel}</button>}
        <button className="primary-button" type="submit" disabled={submitting} onClick={() => setAction('primary')}>{submitting ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  )
}
