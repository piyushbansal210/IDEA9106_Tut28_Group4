import type { SaleStatus, Show } from './types'
import { useStore } from './store'
import { navigate } from './router'
import { showPath } from './sale'

const order: SaleStatus[] = ['queue-open', 'waiting-room', 'on-sale', 'presale-soon', 'announced', 'sold-out']

// The show a tour card should feature: the one with the most "live" sale right now.
export function useFeaturedShow() {
  const { shows, statusOf } = useStore()
  return (tourId: string): Show | undefined =>
    shows
      .filter((s) => s.tourId === tourId)
      .sort((a, b) => order.indexOf(statusOf(a)) - order.indexOf(statusOf(b)) || a.saleOpensAt.localeCompare(b.saleOpensAt))[0]
}

// What the single primary button does for a show, given its sale status. Account-only steps ask to log in
// first and then carry on with exactly what the user tried to do.
export function useShowAction() {
  const store = useStore()
  return (show: Show) => {
    const status = store.statusOf(show)
    const arena = store.arenaOf(show)
    const goWithPlan = (page: 'waiting' | 'queue') => {
      if (store.planFor(show.id)) navigate(showPath(show, page))
      else navigate(`/tour/${show.tourId}?plan=${show.id}&then=${page}`)
    }

    switch (status) {
      case 'announced':
      case 'presale-soon':
        return store.requireLogin('Log in to get a reminder before tickets go on sale.', () => {
          if (store.hasReminder(show.id)) {
            store.toggleReminder(show.id)
            store.toast('Reminder removed.')
          } else {
            store.toggleReminder(show.id)
            store.toast(`You're registered for the ${arena.city} sale. We'll remind you 1 hour before it opens.`)
          }
        })
      case 'waiting-room':
        return store.requireLogin('Log in to join the waiting room. Your ticket plan is saved to your account.', () => goWithPlan('waiting'))
      case 'queue-open':
        return store.requireLogin('Log in to join the queue. Your ticket plan is saved to your account.', () => goWithPlan('queue'))
      case 'on-sale':
        return store.requireLogin('Log in to buy tickets.', () => navigate(showPath(show, 'seats')))
      case 'sold-out':
        return store.requireLogin('Log in to join the waitlist.', () => navigate(`${showPath(show, 'outcome')}?r=sold-out`))
    }
  }
}
